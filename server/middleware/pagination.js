// Pagination Utility for List Endpoints
// Standardizes limit and offset parsing, slicing, and metadata headers.

function parsePagination(req, defaultLimit = 50, maxLimit = 100) {
  let limit = parseInt(req.query.limit, 10);
  let offset = parseInt(req.query.offset, 10);

  if (isNaN(limit) || limit < 1) {
    limit = defaultLimit;
  } else if (limit > maxLimit) {
    limit = maxLimit;
  }

  if (isNaN(offset) || offset < 0) {
    offset = 0;
  }

  return { limit, offset };
}

/**
 * Paginates an array and sets pagination headers on the response.
 * Supports standard array responses and { data, pagination } envelope if requested.
 *
 * @param {Array} list
 * @param {Object} req Express request
 * @param {Object} res Express response
 * @param {number} [defaultLimit=50]
 * @param {number} [maxLimit=100]
 */
function paginate(list, req, res, defaultLimit = 50, maxLimit = 100) {
  if (!Array.isArray(list)) {
    return list;
  }

  const { limit, offset } = parsePagination(req, defaultLimit, maxLimit);
  const total = list.length;
  const paged = list.slice(offset, offset + limit);

  if (res && typeof res.setHeader === 'function') {
    res.setHeader('X-Total-Count', String(total));
    res.setHeader('X-Pagination-Limit', String(limit));
    res.setHeader('X-Pagination-Offset', String(offset));
    res.setHeader('X-Pagination-Has-More', String(offset + limit < total));
  }

  // If client explicitly asks for envelope format via query (?format=envelope) or header
  if (req && (req.query?.format === 'envelope' || req.headers?.['x-pagination-format'] === 'envelope')) {
    return {
      data: paged,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    };
  }

  return paged;
}

module.exports = {
  parsePagination,
  paginate
};

