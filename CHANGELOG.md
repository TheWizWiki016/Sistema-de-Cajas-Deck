# Changelog
All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project follows Semantic Versioning.

## [Unreleased]
### Added
- Beer count flow with per-item navigation, keypad input, and image lookup by UPC.
- Beer count report step with manual theoretical pieces, ticket folio requirement, and persistence.
- Change request reporting popup for items (name/image/code/boxes) and storage in `change_requests`.
- Admin dashboard section for change requests.
- Dynamic tool pages so newly created buttons open a page automatically.
- API to serve beer images from `images/`.
- Support for `upc` and `cantidadPorCaja` in articles (UI + API).

### Changed
- Admin dashboard: cortes filtered to today and yesterday.
- Admin dashboard spacing tightened for a denser layout.
- Dashboard tool routing uses fallback `/tools/{key}` for new tools.

### Fixed
- Type handling for `cantidadPorCaja` in beer count storage.

## [0.1.0]
### Added
- Login and session handling with roles: `super-root`, `admin`, `usuario`.
- Dashboard with tool management, user management, and role assignment.
- Cash cuts (cortes) flow with adjustments and history.
- Inventory tools for conteos, articulos, and familias.
- MongoDB encryption utilities and setup endpoints.
