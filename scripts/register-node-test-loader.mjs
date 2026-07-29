/**
 * Registers the Node test resolve hook so unit tests can import app modules
 * the same way Next.js does (extensionless relatives + `src/` alias).
 */
import { register } from 'node:module';

register('./node-test-resolve-hook.mjs', import.meta.url);
