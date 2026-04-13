import { Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Box } from '@mui/material';

interface TableSkeletonProps {
  columns?: number;
  rows?: number;
}

export function TableSkeleton({ columns = 7, rows = 8 }: TableSkeletonProps) {
  return (
    <Paper sx={{ overflow: 'hidden', borderRadius: '2px' }}>
      {/* Resource count bar skeleton */}
      <Box sx={{
        px: 1.5, py: 0.75, backgroundColor: 'background.default', borderBottom: '1px solid',
        borderColor: 'divider',
      }}>
        <Skeleton width={120} height={16} />
      </Box>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {Array.from({ length: columns }).map((_, i) => (
                <TableCell key={i}>
                  <Skeleton width={i === 0 ? 140 : 80} height={14} />
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.from({ length: rows }).map((_, rowIdx) => (
              <TableRow key={rowIdx}>
                {Array.from({ length: columns }).map((_, colIdx) => (
                  <TableCell key={colIdx}>
                    <Skeleton
                      width={colIdx === 0 ? '80%' : colIdx === columns - 1 ? 60 : '60%'}
                      height={16}
                      variant={colIdx === columns - 1 ? 'rounded' : 'text'}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
