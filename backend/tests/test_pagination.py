"""Unit tests for pagination utility."""

from app.utils.pagination import paginate, PaginatedResponse


class TestPaginate:
    def test_basic_pagination(self):
        result = paginate([{"id": 1}, {"id": 2}], page=1, page_size=10, total=2)
        assert isinstance(result, PaginatedResponse)
        assert result.total == 2
        assert result.page == 1
        assert result.page_size == 10
        assert result.total_pages == 1
        assert len(result.items) == 2

    def test_multiple_pages(self):
        items = [{"id": i} for i in range(10)]
        result = paginate(items, page=1, page_size=10, total=25)
        assert result.total_pages == 3
        assert result.total == 25

    def test_empty_results(self):
        result = paginate([], page=1, page_size=25, total=0)
        assert result.total_pages == 1  # min 1 page
        assert result.total == 0
        assert len(result.items) == 0

    def test_exact_page_boundary(self):
        result = paginate([{"id": 1}], page=5, page_size=5, total=25)
        assert result.total_pages == 5
        assert result.page == 5
