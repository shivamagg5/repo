import { SearchService } from './search.service';

describe('SearchService — Cursor Pagination & Deterministic Sorting', () => {
  let searchService: SearchService;

  beforeEach(() => {
    searchService = new SearchService({} as any);
  });

  it('encodes and decodes cursor tokens correctly', () => {
    const lastVal = '2026-09-15T18:00:00.000Z';
    const lastId = '123e4567-e89b-12d3-a456-426614174000';

    const token = searchService.encodeCursor(lastVal, lastId);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(10);

    const decoded = searchService.decodeCursor(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.lastVal).toBe(lastVal);
    expect(decoded?.lastId).toBe(lastId);
  });

  it('returns null when decoding invalid cursor token', () => {
    expect(searchService.decodeCursor(undefined)).toBeNull();
    expect(searchService.decodeCursor('invalid-base64!!!')).toBeNull();
  });
});
