import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

/**
 * Server Component - Static Data Table
 * Use this for read-only tables without interactions
 * Renders on server for better performance
 */
interface ServerTableProps<T> {
  data: T[]
  columns: {
    header: string
    accessor: keyof T | ((row: T) => React.ReactNode)
    className?: string
  }[]
  className?: string
}

export function ServerTable<T>({ 
  data, 
  columns,
  className 
}: ServerTableProps<T>) {
  return (
    <Table className={className}>
      <TableHeader>
        <TableRow>
          {columns.map((column, index) => (
            <TableHead key={index} className={column.className}>
              {column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell 
              colSpan={columns.length} 
              className="h-24 text-center text-muted-foreground"
            >
              No data available
            </TableCell>
          </TableRow>
        ) : (
          data.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {columns.map((column, colIndex) => (
                <TableCell key={colIndex} className={column.className}>
                  {typeof column.accessor === 'function'
                    ? column.accessor(row)
                    : String(row[column.accessor])}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
