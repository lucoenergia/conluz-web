# Common conluz-web commands.
#
# Every target wraps an npm script or a command documented in AGENTS.md, CONTRIBUTE.md or the
# testing skill, with nothing added: the npm scripts and the documented raw commands keep working
# without `make`.
#
# Agents never run `visual-update` or `generate-client` (AGENTS.md).

SPEC    ?=
PROJECT ?=
FILES   ?=

PROJECT_FLAG := $(if $(PROJECT),--project=$(PROJECT),)

.DEFAULT_GOAL := help

.PHONY: help install dev build lint typecheck test test-watch test-related check \
        visual visual-exact visual-names visual-update mutation-hook-list generate-client

help:
	@echo "conluz-web common commands"
	@echo
	@echo "  make install                     Install dependencies (npm ci)"
	@echo "  make dev                         Start the dev server on port 3001"
	@echo "  make build                       Type-check and build for production"
	@echo "  make lint                        Run ESLint"
	@echo "  make typecheck                   Type-check every project (tsc -b)"
	@echo "  make test                        Run the Vitest suite once"
	@echo "  make test-watch                  Run Vitest in watch mode"
	@echo "  make test-related FILES=\"a b\"    Run the test specs that import the given files"
	@echo "  make check                       lint + typecheck + test, the gates CI runs"
	@echo
	@echo "  make visual                      Run the full visual suite (both projects)"
	@echo "  make visual SPEC=<spec>          Run only these visual test spec files"
	@echo "  make visual PROJECT=<project>    Run only the mobile or desktop project"
	@echo "  make visual-exact                Compare every capture exactly, JSON report on stdout"
	@echo "  make visual-names                Print duplicate screenshot names (must print nothing)"
	@echo "  make mutation-hook-list          Re-derive the mutation-hook list from api-docs.json"
	@echo
	@echo "  Maintainers only (agents never run these):"
	@echo "  make visual-update [SPEC=…] [PROJECT=…]  Regenerate changed and missing baselines"
	@echo "  make generate-client             Regenerate src/api/ from api-docs.json"

install:
	npm ci

dev:
	npm run dev

build:
	npm run build

lint:
	npm run lint

typecheck:
	npx tsc -b

test:
	npx vitest run

test-watch:
	npx vitest

test-related:
	$(if $(FILES),,$(error FILES is required, e.g. make test-related FILES="src/App.tsx"))
	npx vitest related --run $(FILES)

check: lint typecheck test

visual:
	npx playwright test $(SPEC) $(PROJECT_FLAG)

# Silent, so that the JSON report on stdout can be redirected to a file.
visual-exact:
	@VISUAL_EXACT=1 npx playwright test --reporter=json

# Silent, so that a clean tree prints nothing.
visual-names:
	@perl -0777 -ne 's{/\*.*?\*/}{}gs; s{^\s*//.*}{}gm; print "$$1\n" while /\.toHaveScreenshot\(\s*"([^"]+)"/g' $$(find tests/visual -name '*.spec.ts') | sort | uniq -d

mutation-hook-list:
	npm run generate-mutation-hook-list

visual-update:
	npm run test:visual -- $(SPEC) $(PROJECT_FLAG) --update-snapshots=changed

generate-client:
	npm run generate-client
