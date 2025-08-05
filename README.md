# ds4ch-bolt-contentful-migration

Node.js scripts to migrate content from Europeana Bolt CMS MySQL database,
to Contentful `blogPosting` content type.

## Installation

Install dependencies with:

```sh
pnpm install
```

## Configuration

Copy the supplied [`.env.example`](./.env.example) file to `.env`, and populate
with the configuration for MySQL and Contentful.

## Usage

### 1. Authors

First, authors need to be migrated:

```sh
pnpm migrate authors
```

**NOTE:** if authors are not migrated first, then posts will not be linked to
them.

### 2. Posts

Second, posts need to be migrated:

```sh
pnpm migrate posts
```

## License

Licensed under the EUPL v1.2.

For full details, see [LICENSE.md](LICENSE.md).
