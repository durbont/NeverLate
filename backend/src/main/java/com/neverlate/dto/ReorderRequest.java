// Request body for the reorder endpoint.
// Contains the commute IDs in the desired display order (first ID = top of list).

package com.neverlate.dto;

import java.util.List;

public record ReorderRequest(List<Long> ids) {}
