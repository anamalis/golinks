"""Print the OpenAPI schema to stdout; used by `make types` to generate frontend types."""

import json

from golinks.main import app

if __name__ == "__main__":
    print(json.dumps(app.openapi(), indent=2))
