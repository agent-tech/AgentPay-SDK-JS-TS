# Changelog

## [0.2.0](https://github.com/cross402/usdc-sdk-js-ts/compare/usdc-v0.1.10...usdc-v0.2.0) (2026-05-30)


### ⚠ BREAKING CHANGES

* 

### Features

* add USDT asset support and swap endpoints ([8c9025a](https://github.com/cross402/usdc-sdk-js-ts/commit/8c9025a0142a11f1c0396c3f0972883cec06f661))
* add USDT asset support and swap endpoints ([9c4fa8e](https://github.com/cross402/usdc-sdk-js-ts/commit/9c4fa8e104d901865873ea5f84bd8d1deea9d65f))
* align response model with multichain-to-multichain backend ([a5fca69](https://github.com/cross402/usdc-sdk-js-ts/commit/a5fca6959f572670323f87ff1754e008ab2844ab))
* expose agentId on intent responses, add SkaleBaseSepolia, relax settlement quote on GetIntent ([8624087](https://github.com/cross402/usdc-sdk-js-ts/commit/8624087490870a42b9abf6ae2c9c7cb674b50cf3))
* expose agentId on intents, add SkaleBaseSepolia, relax GetIntent quote fields ([4330a69](https://github.com/cross402/usdc-sdk-js-ts/commit/4330a695c548f70f82808c97f158de5c82d7c5c1))

## [0.1.10](https://github.com/cross402/usdc-sdk-js-ts/compare/usdc-v0.1.9...usdc-v0.1.10) (2026-04-28)


### Bug Fixes

* build not export correctly ([4b6cd06](https://github.com/cross402/usdc-sdk-js-ts/commit/4b6cd0677223e8b5bb2876caf86a8c303452059f))
* build not export correctly ([f8cf852](https://github.com/cross402/usdc-sdk-js-ts/commit/f8cf85227d7d22320b13a3f0e42f5654846d4e71))

## [0.1.9](https://github.com/cross402/usdc-sdk-js-ts/compare/usdc-v0.1.8...usdc-v0.1.9) (2026-04-28)


### Bug Fixes

* replace --packages external with explicit --external flags in build ([101c1e4](https://github.com/cross402/usdc-sdk-js-ts/commit/101c1e489516879f0e8c2f85f0edff6acb87b8f2))
* replace --packages external with explicit --external flags in build ([af33d68](https://github.com/cross402/usdc-sdk-js-ts/commit/af33d681fa08b54e10e317ca7c97ffc6fbd7927d))

## [0.1.8](https://github.com/cross402/usdc-sdk-js-ts/compare/usdc-v0.1.7...usdc-v0.1.8) (2026-04-28)


### Features

* add targetChain support to CreateIntentRequest ([099224c](https://github.com/cross402/usdc-sdk-js-ts/commit/099224c212da059d6327d38e9e49ac9bfd3e3edc))
* add targetChain support to CreateIntentRequest ([f85cae9](https://github.com/cross402/usdc-sdk-js-ts/commit/f85cae930bc4f89c34f13bdeb92caf376bd157b9))


### Code Refactoring

* make targetChain required in CreateIntentRequest ([cb34e89](https://github.com/cross402/usdc-sdk-js-ts/commit/cb34e899b9ea2b29b59ef77688dbb979afffa5ac))

## [0.1.7](https://github.com/cross402/usdc-sdk-js-ts/compare/usdc-v0.1.6...usdc-v0.1.7) (2026-03-27)


### Features

* add agent-pay CLI reference documentation and skills section to README for enhanced user guidance ([b097ec8](https://github.com/cross402/usdc-sdk-js-ts/commit/b097ec8ec8682db3a2445c430ce6852025af4952))
* add badges for npm version, Node.js compatibility, and TypeScript support in README ([f1a0c8d](https://github.com/cross402/usdc-sdk-js-ts/commit/f1a0c8dcb18c62127419eebb3a125f89932a0a35))
* add balance command to read USDC balance from Base chain, update documentation accordingly ([ec99ef6](https://github.com/cross402/usdc-sdk-js-ts/commit/ec99ef6d03a08e69af3fba41b5a4bf5294e4cced))
* add bun.lock file and update build scripts in package.json for improved bundling; modify TypeScript configurations for declaration generation ([a4829c4](https://github.com/cross402/usdc-sdk-js-ts/commit/a4829c48a3dabf92c9e60c4e0103cdcc9ec59be9))
* add camelcase-keys and decamelize-keys for improved key conversion in PayClient ([0ea810c](https://github.com/cross402/usdc-sdk-js-ts/commit/0ea810cbb7335b04385ebb5d0c9e99eab1b7e07d))
* add Chain and ChainValue types for supported blockchain identifiers ([2576255](https://github.com/cross402/usdc-sdk-js-ts/commit/2576255f561ce76d62ecfe83d02b2462457f3fde))
* add pnpm lockfile and improve package.json with sideEffects flag; update README and examples for API endpoint changes ([7bb85e4](https://github.com/cross402/usdc-sdk-js-ts/commit/7bb85e4a9a03697418956408a5853ca48f091985))
* enhance Agent Tech Pay SDK with dedicated server and client entry points, add CLI for auth management and intent operations, and update documentation accordingly ([6cc7613](https://github.com/cross402/usdc-sdk-js-ts/commit/6cc76139de1e11d19b03674489333cdd7f05dfbb))
* enhance PayClient with validation and key conversion improvements ([5f93bc0](https://github.com/cross402/usdc-sdk-js-ts/commit/5f93bc00406a10500a55a0813cc794ec0d2974f6))
* good init ([87c44c1](https://github.com/cross402/usdc-sdk-js-ts/commit/87c44c1749e5f0e9b72c9b3636bc2355c84e5cc1))
* implement PublicPayClient for unauthenticated API access and refactor error handling ([4117706](https://github.com/cross402/usdc-sdk-js-ts/commit/41177065a4c2a6eb30ebbb14b4b87ef0c4f9bf15))
* integrate Zod for input validation in PayClient and PublicPayClient, update README for validation error handling, and add new schemas for request validation ([462794a](https://github.com/cross402/usdc-sdk-js-ts/commit/462794aca5d4694f21adf8b71ab80c7b12c1adff))
* refactor PayClient and PublicPayClient to use a generic Fetcher interface for HTTP requests ([a1108bd](https://github.com/cross402/usdc-sdk-js-ts/commit/a1108bd42353bc6b06a368811ffbe99d8bc4e2d8))
* update agent-pay CLI with new session management commands, enhance README and reference documentation, and refactor config handling for improved data storage ([5e2211c](https://github.com/cross402/usdc-sdk-js-ts/commit/5e2211c135cf5276a503f701d980c933ae0c94cc))
* update authentication method in PayClient to use apiKey and secretKey; modify README and examples accordingly ([ecf75b2](https://github.com/cross402/usdc-sdk-js-ts/commit/ecf75b2310067a7aec734a3509efa2bb5693e096))
* update package name to @agent-tech/pay and enhance README with client details ([eaf33af](https://github.com/cross402/usdc-sdk-js-ts/commit/eaf33af4d4c36649e4e9f71d6bb3f44a990e7e4a))
* update README to reflect support for both JavaScript and TypeScript ([6c7099c](https://github.com/cross402/usdc-sdk-js-ts/commit/6c7099cdf6579e80aa8648f6d6318a5f6cb40714))


### Bug Fixes

* update minimum send amount to 0.02 USDC and adjust related tests and documentation ([02b4f00](https://github.com/cross402/usdc-sdk-js-ts/commit/02b4f0033df855ff135cf1d10f67b47cbe65a382))
* update repository URLs in documentation and configuration files to reflect new GitHub path ([cc7acb9](https://github.com/cross402/usdc-sdk-js-ts/commit/cc7acb934c065811c579dc69972e93e848c7a5c8))
* update V2_PATH_PREFIX to remove 'api' prefix for cleaner API endpoint structure ([3f1b365](https://github.com/cross402/usdc-sdk-js-ts/commit/3f1b365a6ac1c8497aecbd00e3dd05787bedef0e))


### Code Refactoring

* implement Zod schemas for configuration and command validation, enhancing input handling and error management across CLI commands ([0eec7fa](https://github.com/cross402/usdc-sdk-js-ts/commit/0eec7fa98cd3a0830f4c4bdced66e6b9d44061fd))
* rename package and CLI from @agenttech/pay to @cross402/usdc; update documentation and configuration paths accordingly ([87f3010](https://github.com/cross402/usdc-sdk-js-ts/commit/87f30101b89a3edaebcf408c8f46d1c0211477ff))
* update API endpoints to remove 'api' prefix for cleaner structure across documentation and client implementation ([291ba60](https://github.com/cross402/usdc-sdk-js-ts/commit/291ba60d6875455b04c1a7292e552a019d808b0b))

## [0.1.6](https://github.com/cross402/usdc-sdk-js-ts/compare/pay-v0.1.5...pay-v0.1.6) (2026-03-05)


### Code Refactoring

* update API endpoints to remove 'api' prefix for cleaner structure across documentation and client implementation ([291ba60](https://github.com/cross402/usdc-sdk-js-ts/commit/291ba60d6875455b04c1a7292e552a019d808b0b))

## [0.1.5](https://github.com/cross402/usdc-sdk-js-ts/compare/pay-v0.1.4...pay-v0.1.5) (2026-03-05)


### Bug Fixes

* update V2_PATH_PREFIX to remove 'api' prefix for cleaner API endpoint structure ([3f1b365](https://github.com/cross402/usdc-sdk-js-ts/commit/3f1b365a6ac1c8497aecbd00e3dd05787bedef0e))

## [0.1.4](https://github.com/cross402/usdc-sdk-js-ts/compare/pay-v0.1.3...pay-v0.1.4) (2026-03-05)


### Code Refactoring

* implement Zod schemas for configuration and command validation, enhancing input handling and error management across CLI commands ([0eec7fa](https://github.com/cross402/usdc-sdk-js-ts/commit/0eec7fa98cd3a0830f4c4bdced66e6b9d44061fd))

## [0.1.3](https://github.com/cross402/usdc-sdk-js-ts/compare/pay-v0.1.2...pay-v0.1.3) (2026-03-05)


### Features

* add balance command to read USDC balance from Base chain, update documentation accordingly ([ec99ef6](https://github.com/cross402/usdc-sdk-js-ts/commit/ec99ef6d03a08e69af3fba41b5a4bf5294e4cced))

## [0.1.2](https://github.com/cross402/usdc-sdk-js-ts/compare/pay-v0.1.1...pay-v0.1.2) (2026-03-05)


### Features

* integrate Zod for input validation in PayClient and PublicPayClient, update README for validation error handling, and add new schemas for request validation ([462794a](https://github.com/cross402/usdc-sdk-js-ts/commit/462794aca5d4694f21adf8b71ab80c7b12c1adff))

## [0.1.1](https://github.com/cross402/usdc-sdk-js-ts/compare/pay-v0.1.0...pay-v0.1.1) (2026-03-03)


### Features

* add cross402-usdc CLI reference documentation and skills section to README for enhanced user guidance ([b097ec8](https://github.com/cross402/usdc-sdk-js-ts/commit/b097ec8ec8682db3a2445c430ce6852025af4952))
* add badges for npm version, Node.js compatibility, and TypeScript support in README ([f1a0c8d](https://github.com/cross402/usdc-sdk-js-ts/commit/f1a0c8dcb18c62127419eebb3a125f89932a0a35))
* add bun.lock file and update build scripts in package.json for improved bundling; modify TypeScript configurations for declaration generation ([a4829c4](https://github.com/cross402/usdc-sdk-js-ts/commit/a4829c48a3dabf92c9e60c4e0103cdcc9ec59be9))
* add camelcase-keys and decamelize-keys for improved key conversion in PayClient ([0ea810c](https://github.com/cross402/usdc-sdk-js-ts/commit/0ea810cbb7335b04385ebb5d0c9e99eab1b7e07d))
* add pnpm lockfile and improve package.json with sideEffects flag; update README and examples for API endpoint changes ([7bb85e4](https://github.com/cross402/usdc-sdk-js-ts/commit/7bb85e4a9a03697418956408a5853ca48f091985))
* enhance Agent Tech USDC SDK with dedicated server and client entry points, add CLI for auth management and intent operations, and update documentation accordingly ([6cc7613](https://github.com/cross402/usdc-sdk-js-ts/commit/6cc76139de1e11d19b03674489333cdd7f05dfbb))
* enhance PayClient with validation and key conversion improvements ([5f93bc0](https://github.com/cross402/usdc-sdk-js-ts/commit/5f93bc00406a10500a55a0813cc794ec0d2974f6))
* good init ([87c44c1](https://github.com/cross402/usdc-sdk-js-ts/commit/87c44c1749e5f0e9b72c9b3636bc2355c84e5cc1))
* implement PublicPayClient for unauthenticated API access and refactor error handling ([4117706](https://github.com/cross402/usdc-sdk-js-ts/commit/41177065a4c2a6eb30ebbb14b4b87ef0c4f9bf15))
* refactor PayClient and PublicPayClient to use a generic Fetcher interface for HTTP requests ([a1108bd](https://github.com/cross402/usdc-sdk-js-ts/commit/a1108bd42353bc6b06a368811ffbe99d8bc4e2d8))
* update cross402-usdc CLI with new session management commands, enhance README and reference documentation, and refactor config handling for improved data storage ([5e2211c](https://github.com/cross402/usdc-sdk-js-ts/commit/5e2211c135cf5276a503f701d980c933ae0c94cc))
* update authentication method in PayClient to use apiKey and secretKey; modify README and examples accordingly ([ecf75b2](https://github.com/cross402/usdc-sdk-js-ts/commit/ecf75b2310067a7aec734a3509efa2bb5693e096))
* update package name to @cross402/usdc and enhance README with client details ([eaf33af](https://github.com/cross402/usdc-sdk-js-ts/commit/eaf33af4d4c36649e4e9f71d6bb3f44a990e7e4a))
* update README to reflect support for both JavaScript and TypeScript ([6c7099c](https://github.com/cross402/usdc-sdk-js-ts/commit/6c7099cdf6579e80aa8648f6d6318a5f6cb40714))

## Changelog

All notable changes to this project will be documented in this file.

This file is automatically updated by [Release Please](https://github.com/googleapis/release-please).
Commit messages follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.
