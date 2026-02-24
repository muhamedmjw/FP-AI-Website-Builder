/**
 * ZIP Service — generates downloadable ZIP archives from website files.
 *
 * Responsibilities:
 * - Fetch all files for a given website_id from the files table
 * - Package them into a ZIP archive with proper folder structure
 * - Include a generated README.md if not already present
 * - Return a Buffer suitable for streaming as a file download response
 * - Log the download to the zip_downloads table
 */
export {}
