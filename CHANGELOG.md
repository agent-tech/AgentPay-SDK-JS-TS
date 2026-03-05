# Changelog

## [0.1.6](https://github.com/agent-tech/AgentPay-SDK-JS-TS/compare/pay-v0.1.5...pay-v0.1.6) (2026-03-05)


### Code Refactoring

* update API endpoints to remove 'api' prefix for cleaner structure across documentation and client implementation ([291ba60](https://github.com/agent-tech/AgentPay-SDK-JS-TS/commit/291ba60d6875455b04c1a7292e552a019d808b0b))

## [0.1.5](https://github.com/agent-tech/AgentPay-SDK-JS-TS/compare/pay-v0.1.4...pay-v0.1.5) (2026-03-05)


### Bug Fixes

* update V2_PATH_PREFIX to remove 'api' prefix for cleaner API endpoint structure ([3f1b365](https://github.com/agent-tech/AgentPay-SDK-JS-TS/commit/3f1b365a6ac1c8497aecbd00e3dd05787bedef0e))

## [0.1.4](https://github.com/agent-tech/AgentPay-SDK-JS-TS/compare/pay-v0.1.3...pay-v0.1.4) (2026-03-05)


### Code Refactoring

* implement Zod schemas for configuration and command validation, enhancing input handling and error management across CLI commands ([0eec7fa](https://github.com/agent-tech/AgentPay-SDK-JS-TS/commit/0eec7fa98cd3a0830f4c4bdced66e6b9d44061fd))

## [0.1.3](https://github.com/agent-tech/AgentPay-SDK-JS-TS/compare/pay-v0.1.2...pay-v0.1.3) (2026-03-05)


### Features

* add balance command to read USDC balance from Base chain, update documentation accordingly ([ec99ef6](https://github.com/agent-tech/AgentPay-SDK-JS-TS/commit/ec99ef6d03a08e69af3fba41b5a4bf5294e4cced))

## [0.1.2](https://github.com/agent-tech/AgentPay-SDK-JS-TS/compare/pay-v0.1.1...pay-v0.1.2) (2026-03-05)


### Features

* integrate Zod for input validation in PayClient and PublicPayClient, update README for validation error handling, and add new schemas for request validation ([462794a](https://github.com/agent-tech/AgentPay-SDK-JS-TS/commit/462794aca5d4694f21adf8b71ab80c7b12c1adff))

## [0.1.1](https://github.com/agent-tech/AgentPay-SDK-JS-TS/compare/pay-v0.1.0...pay-v0.1.1) (2026-03-03)


### Features

* add agent-pay CLI reference documentation and skills section to README for enhanced user guidance ([b097ec8](https://github.com/agent-tech/AgentPay-SDK-JS-TS/commit/b097ec8ec8682db3a2445c430ce6852025af4952))
* add badges for npm version, Node.js compatibility, and TypeScript support in README ([f1a0c8d](https://github.com/agent-tech/AgentPay-SDK-JS-TS/commit/f1a0c8dcb18c62127419eebb3a125f89932a0a35))
* add bun.lock file and update build scripts in package.json for improved bundling; modify TypeScript configurations for declaration generation ([a4829c4](https://github.com/agent-tech/AgentPay-SDK-JS-TS/commit/a4829c48a3dabf92c9e60c4e0103cdcc9ec59be9))
* add camelcase-keys and decamelize-keys for improved key conversion in PayClient ([0ea810c](https://github.com/agent-tech/AgentPay-SDK-JS-TS/commit/0ea810cbb7335b04385ebb5d0c9e99eab1b7e07d))
* add pnpm lockfile and improve package.json with sideEffects flag; update README and examples for API endpoint changes ([7bb85e4](https://github.com/agent-tech/AgentPay-SDK-JS-TS/commit/7bb85e4a9a03697418956408a5853ca48f091985))
* enhance Agent Tech Pay SDK with dedicated server and client entry points, add CLI for auth management and intent operations, and update documentation accordingly ([6cc7613](https://github.com/agent-tech/AgentPay-SDK-JS-TS/commit/6cc76139de1e11d19b03674489333cdd7f05dfbb))
* enhance PayClient with validation and key conversion improvements ([5f93bc0](https://github.com/agent-tech/AgentPay-SDK-JS-TS/commit/5f93bc00406a10500a55a0813cc794ec0d2974f6))
* good init ([87c44c1](https://github.com/agent-tech/AgentPay-SDK-JS-TS/commit/87c44c1749e5f0e9b72c9b3636bc2355c84e5cc1))
* implement PublicPayClient for unauthenticated API access and refactor error handling ([4117706](https://github.com/agent-tech/AgentPay-SDK-JS-TS/commit/41177065a4c2a6eb30ebbb14b4b87ef0c4f9bf15))
* refactor PayClient and PublicPayClient to use a generic Fetcher interface for HTTP requests ([a1108bd](https://github.com/agent-tech/AgentPay-SDK-JS-TS/commit/a1108bd42353bc6b06a368811ffbe99d8bc4e2d8))
* update agent-pay CLI with new session management commands, enhance README and reference documentation, and refactor config handling for improved data storage ([5e2211c](https://github.com/agent-tech/AgentPay-SDK-JS-TS/commit/5e2211c135cf5276a503f701d980c933ae0c94cc))
* update authentication method in PayClient to use apiKey and secretKey; modify README and examples accordingly ([ecf75b2](https://github.com/agent-tech/AgentPay-SDK-JS-TS/commit/ecf75b2310067a7aec734a3509efa2bb5693e096))
* update package name to @agent-tech/pay and enhance README with client details ([eaf33af](https://github.com/agent-tech/AgentPay-SDK-JS-TS/commit/eaf33af4d4c36649e4e9f71d6bb3f44a990e7e4a))
* update README to reflect support for both JavaScript and TypeScript ([6c7099c](https://github.com/agent-tech/AgentPay-SDK-JS-TS/commit/6c7099cdf6579e80aa8648f6d6318a5f6cb40714))

## Changelog

All notable changes to this project will be documented in this file.

This file is automatically updated by [Release Please](https://github.com/googleapis/release-please).
Commit messages follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.
