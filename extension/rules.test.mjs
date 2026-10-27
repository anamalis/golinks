// Checks the redirect rules without a browser: applies each rule's regexFilter and
// regexSubstitution the way Chrome does (the matched span is replaced, so a full match
// replaces the whole URL). Run with `node --test extension/rules.test.mjs` (part of `make test`).
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const rules = JSON.parse(readFileSync(new URL('./rules.json', import.meta.url), 'utf8'))

/** Where Chrome would send `url`, or null if no rule matches. */
function redirect(url) {
  for (const { action, condition } of rules) {
    const filter = new RegExp(condition.regexFilter)
    if (filter.test(url)) {
      return url.replace(filter, action.redirect.regexSubstitution.replace(/\\(\d)/g, '$$$1'))
    }
  }
  return null
}

const TARGET = 'http://go.localhost:8000/'

test('typed go/ URLs go to the backend', () => {
  assert.equal(redirect('http://go/docs'), `${TARGET}docs`)
  assert.equal(redirect('https://go/docs/'), `${TARGET}docs/`)
})

for (const [engine, search] of [
  ['Google', 'https://www.google.com/search?q='],
  ['Bing', 'https://www.bing.com/search?q='],
  ['DuckDuckGo', 'https://duckduckgo.com/?q='],
]) {
  test(`${engine}: a go/<name> search goes to the backend`, () => {
    assert.equal(redirect(`${search}go%2Fdocs`), `${TARGET}docs`)
    assert.equal(redirect(`${search}go/Q3-plan_v2`), `${TARGET}Q3-plan_v2`)
    assert.equal(redirect(`${search}go%2Fdocs%2F`), `${TARGET}docs%2F`)
    assert.equal(redirect(`${search}go%2Fdocs&oq=go%2Fdocs&ie=UTF-8`), `${TARGET}docs`)
    assert.equal(redirect(`${search}go%2Fdocs#top`), `${TARGET}docs`)
  })

  test(`${engine}: anything that isn't a Name stays a search`, () => {
    assert.equal(redirect(`${search}go%2Fdocs+setup`), null)
    assert.equal(redirect(`${search}go%2Fdocs%20setup&oq=x`), null)
    assert.equal(redirect(`${search}go%2Fdocs%2Fextra`), null)
    assert.equal(redirect(`${search}go%2Fcaf%C3%A9`), null)
    assert.equal(redirect(`${search}golang`), null)
  })
}

test('the q parameter can come after others', () => {
  assert.equal(redirect('https://www.google.com/search?client=x&q=go%2Fdocs'), `${TARGET}docs`)
})
