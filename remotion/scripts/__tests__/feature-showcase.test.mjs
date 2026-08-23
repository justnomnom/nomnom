import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, '..', '..', 'src', 'compositions', 'FeatureShowcase');
const LOCALE = join(HERE, '..', '..', '..', 'src', 'locales', 'langs', 'pt.json');

describe('feature showcase catalog', () => {
  const source = readFileSync(join(SRC, 'features.js'), 'utf8');
  const mocks = readFileSync(join(SRC, 'mocks.jsx'), 'utf8');
  const locale = readFileSync(LOCALE, 'utf8');

  it('covers the five shipped product features', () => {
    for (const id of ['feed', 'lists', 'map', 'roulette', 'table']) {
      assert.match(source, new RegExp(`id: '${id}'`));
    }
  });

  it('does not invent ratings or user counts', () => {
    assert.doesNotMatch(source, /\b\d+(?:\.\d+)?\s*★/);
    assert.doesNotMatch(source, /\b\d[\d,.]*\s*(utilizadores|users|seguidores)\b/i);
  });

  it('points captions at justnomnom.com', () => {
    assert.match(source, /justnomnom\.com/);
    assert.doesNotMatch(source, /nomnom\.app/);
  });

  it('uses verbatim app locale strings for titles, bodies, hooks and CTAs', () => {
    const required = [
      'O teu feed, as tuas pessoas',
      'Segue os locais e criadores em quem confias. Vê onde comem mesmo, com as fotos e notas deles.',
      'Segue pessoas com bom gosto.',
      'Segue as listas deles',
      'Locais e criadores criam listas por bairro, ocasião ou cozinha. Explora uma, guarda qualquer sítio, ou segue-a para receberes as novas sugestões.',
      'Explora as listas delas.',
      'No mapa, na lista, partilhado',
      'Percorre o mapa para encontrar sítios perto de ti, guarda os que queres visitar e envia a tua shortlist a quem vai contigo.',
      'Roleta NomNom',
      'Sem ideias?',
      'Gira os Noms!',
      'Abrir uma Mesa',
      'Não sabes onde comer?',
      'Escolhe alguns sítios, partilha o link e votem juntos',
      'Vamos nom nom!',
      'Descobrir',
      'Listas',
      'Mapa',
      'Roleta',
    ];
    for (const phrase of required) {
      assert.ok(source.includes(phrase), `catalog missing: ${phrase}`);
      assert.ok(locale.includes(phrase), `locale missing: ${phrase}`);
    }
  });

  it('does not put invented chrome copy in the product mocks', () => {
    assert.doesNotMatch(mocks, /Quem tu segues/);
    assert.doesNotMatch(mocks, /Sítio 1/);
    assert.doesNotMatch(mocks, /Votem no link/);
    assert.doesNotMatch(mocks, /Notas e fotos reais/);
    assert.doesNotMatch(mocks, /Listas para seguir/);
    assert.doesNotMatch(mocks, /Perto de ti/);
  });

  it('uses live map chrome strings in the map mock', () => {
    const phrases = [
      'Pesquisar sítios ou zonas…',
      'Seguidos',
      'Os meus',
      'Mais…',
      'Sítios perto de ti',
      'Guardar na lista',
    ];
    for (const phrase of phrases) {
      assert.ok(mocks.includes(phrase), `map mock missing: ${phrase}`);
      assert.ok(locale.includes(phrase), `locale missing: ${phrase}`);
    }
  });
});
