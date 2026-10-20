# Common conluz-web commands.
#
# Every target wraps an npm script or a command documented in AGENTS.md, CONTRIBUTE.md or the
# testing skill, with nothing added: the npm scripts and the documented raw commands keep working
# without `make`.
#
# Agents never run `visual-update`, `visual-delete-orphans` or `generate-client` (AGENTS.md).

SPEC    ?=
PROJECT ?=
FILES   ?=

PROJECT_FLAG := $(if $(PROJECT),--project=$(PROJECT),)

# Baseline PNGs whose name no visual test spec passes to toHaveScreenshot(), one path per line.
# Names are read with the same rules as `visual-names`. A baseline left behind for only one project,
# by a test that now runs on the other alone, still matches a name in use and is not listed.
VISUAL_ORPHANS = perl -0777 -e 'my %used; for my $$file (@ARGV) { open my $$fh, "<", $$file or die "$$file: $$!"; local $$_ = <$$fh>; s{/\*.*?\*/}{}gs; s{^\s*//.*}{}gm; $$used{$$1} = 1 while /\.toHaveScreenshot\(\s*"([^"]+)"/g } print "$$_\n" for grep { m{([^/]+)$$} && !$$used{$$1} } sort glob "tests/visual/__screenshots__/*/*.png"' $$(find tests/visual -name '*.spec.ts')

.DEFAULT_GOAL := help

.PHONY: help install dev build lint typecheck test test-watch test-related check \
        visual visual-failed visual-exact visual-names visual-get-orphans visual-delete-orphans \
        visual-update mutation-hook-list generate-client

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
	@echo "  make visual-failed [PROJECT=…]   Re-run only the tests that failed in the last visual run"
	@echo "  make visual-exact                Compare every capture exactly, JSON report on stdout"
	@echo "  make visual-names                Print duplicate screenshot names (must print nothing)"
	@echo "  make visual-get-orphans          List baselines no visual test spec captures any more"
	@echo "  make mutation-hook-list          Re-derive the mutation-hook list from api-docs.json"
	@echo
	@echo "  Maintainers only (agents never run these):"
	@echo "  make visual-update [SPEC=…] [PROJECT=…]  Regenerate changed and missing baselines"
	@echo "  make visual-delete-orphans       git rm the baselines visual-get-orphans lists"
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

# Reads the failures Playwright recorded in test-results/.last-run.json, which every run overwrites.
visual-failed:
	npx playwright test --last-failed $(SPEC) $(PROJECT_FLAG)

# Silent, so that the JSON report on stdout can be redirected to a file.
visual-exact:
	@VISUAL_EXACT=1 npx playwright test --reporter=json

# Silent, so that a clean tree prints nothing.
visual-names:
	@perl -0777 -ne 's{/\*.*?\*/}{}gs; s{^\s*//.*}{}gm; print "$$1\n" while /\.toHaveScreenshot\(\s*"([^"]+)"/g' $$(find tests/visual -name '*.spec.ts') | sort | uniq -d

# Silent, so that a tree with no orphan baseline prints nothing.
visual-get-orphans:
	@$(VISUAL_ORPHANS)

visual-delete-orphans:
	@$(VISUAL_ORPHANS) | xargs -r git rm --

mutation-hook-list:
	npm run generate-mutation-hook-list

visual-update:
	npm run test:visual -- $(SPEC) $(PROJECT_FLAG) --update-snapshots=changed

generate-client:
	npm run generate-client
