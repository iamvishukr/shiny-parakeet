import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

export interface MenuAction<T> {
  label: string;
  onClick: (items: T[]) => void;
  className?: string;
}

export interface MenuContentProps<T> {
  selectedRows: T[];
  actions: MenuAction<T>[];
}

export function menuContent<T>({ selectedRows, actions }: MenuContentProps<T>) {
  return (
    <DropdownMenuContent align="end">
      <DropdownMenuLabel>Bulk Actions</DropdownMenuLabel>
      {actions.map((action, index) => (
        <DropdownMenuItem
          key={index}
          onClick={() => action.onClick(selectedRows)}
          className={action.className}
        >
          {action.label}
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  );
} 