'use client';

import { useEffect } from 'react';
import type { User } from '@/types';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, ShieldCheck, ShieldAlert, Eye, ArrowUpAZ, ArrowDownAZ, ChevronsUpDown, MoreVertical, Layers, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface UserListTableProps {
  users: User[];
  onEditUser: (userId: string) => void;
  onDeleteUser: (userId: string) => void;
  onSort: (key: keyof User | string, direction: 'asc' | 'desc' | null) => void;
  currentSortKey?: keyof User | string | null;
  currentSortDirection?: 'asc' | 'desc' | null;
}

export default function UserListTable({ 
  users, 
  onEditUser, 
  onDeleteUser,
  onSort,
  currentSortKey,
  currentSortDirection 
}: UserListTableProps) {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  const { toast } = useToast();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  if (isLoadingTranslations && (!users || users.length === 0)) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!users || users.length === 0) {
    return <p className="text-center text-muted-foreground py-8">{t('UserListTable.noUsersMessage')}</p>;
  }

  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const RoleIcon = ({ role }: { role: User['role'] }) => {
    switch (role) {
      case 'Admin': return <ShieldCheck className="h-4 w-4 text-green-600" />;
      case 'Editor': return <ShieldAlert className="h-4 w-4 text-yellow-600" />;
      case 'Viewer': return <Eye className="h-4 w-4 text-blue-600" />;
      default: return null;
    }
  };

  const SortableHeader = ({ columnKey, label }: { columnKey: keyof User | string, label: string }) => {
    const isCurrentSortColumn = currentSortKey === columnKey;

    const handleSortClick = () => {
      if (isCurrentSortColumn) {
        if (currentSortDirection === 'asc') {
          onSort(columnKey, 'desc');
        } else if (currentSortDirection === 'desc') {
          onSort(columnKey, null);
        } else {
          onSort(columnKey, 'asc');
        }
      } else {
        onSort(columnKey, 'asc');
      }
    };

    const handleGroupBy = () => {
      toast({ title: t('Common.featureComingSoonTitle'), description: t('TableActions.groupingComingSoon', { columnName: String(label) }) });
    };
    
    let SortIcon = ChevronsUpDown;
    if (isCurrentSortColumn) {
      if (currentSortDirection === 'asc') SortIcon = ArrowUpAZ;
      else if (currentSortDirection === 'desc') SortIcon = ArrowDownAZ;
    }

    return (
      <div className="flex items-center justify-between group">
        {label}
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSortClick}
            className="h-7 w-7 ml-2 data-[state=open]:bg-accent"
            aria-label={t('TableActions.cycleSortOrder', { columnName: label })}
          >
            <SortIcon className="h-4 w-4 opacity-40 group-hover:opacity-100" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 data-[state=open]:bg-accent" aria-label={t('TableActions.columnActionsMenu', {columnName: label})}>
                <MoreVertical className="h-4 w-4 opacity-40 group-hover:opacity-100" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleGroupBy}>
                <Layers className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
                {t('TableActions.groupByThisColumn')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };


  return (
    <TooltipProvider delayDuration={100}>
      <div className="rounded-md border shadow-sm max-h-[60vh] overflow-auto relative">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead className="w-[40px] text-center font-semibold whitespace-nowrap">*</TableHead>
              <TableHead className="text-center font-semibold whitespace-nowrap">{t('UserListTable.headerActions')}</TableHead>
              <TableHead className="w-[60px] font-semibold whitespace-nowrap">{t('UserListTable.headerAvatar')}</TableHead>
              <TableHead className={cn("font-semibold min-w-[150px] whitespace-nowrap")}><SortableHeader columnKey="name" label={t('UserListTable.headerName')} /></TableHead>
              <TableHead className={cn("font-semibold whitespace-nowrap")}><SortableHeader columnKey="email" label={t('UserListTable.headerEmail')} /></TableHead>
              <TableHead className={cn("font-semibold whitespace-nowrap")}><SortableHeader columnKey="role" label={t('UserListTable.headerRole')} /></TableHead>
              <TableHead className={cn("font-semibold whitespace-nowrap")}><SortableHeader columnKey="joinDate" label={t('UserListTable.headerJoinDate')} /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user, index) => (
              <TableRow key={user.id} className="hover:bg-muted/50 transition-colors">
                <TableCell className="text-center font-mono text-xs">{index + 1}</TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => onEditUser(user.id)} aria-label={t('UserListTable.editActionLabel', { userName: user.name })}>
                          <Pencil className="h-4 w-4 text-blue-500" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>{t('UserListTable.editActionLabel', { userName: user.name })}</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => onDeleteUser(user.id)} aria-label={t('UserListTable.deleteActionLabel', { userName: user.name })}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>{t('UserListTable.deleteActionLabel', { userName: user.name })}</p></TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>
                <TableCell>
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.imageUrl} alt={user.name} data-ai-hint="user profile"/>
                    <AvatarFallback>
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium whitespace-nowrap">{user.name}</TableCell>
                <TableCell className="whitespace-nowrap">{user.email}</TableCell>
                <TableCell>
                  <Badge variant={user.role === 'Admin' ? 'default' : user.role === 'Editor' ? 'secondary' : 'outline'} className="flex items-center gap-1.5 w-fit whitespace-nowrap">
                    <RoleIcon role={user.role} />
                    {t(`AddUserDialog.roles.${user.role}`)}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap">{new Date(user.joinDate).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
