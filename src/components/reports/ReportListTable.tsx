

'use client';

import { useRxTranslate } from '@/hooks/use-rx-translate';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, Trash2, Edit, MoreVertical } from 'lucide-react';
import type { Report } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";


interface ReportCardProps {
    report: Report;
    onViewReport: (report: Report) => void;
    onDeleteReport: (report: Report) => void;
    onEditReport: (report: Report) => void;
    t: Function;
    currentLocale: string;
}

const ReportCard = ({ report, onViewReport, onDeleteReport, onEditReport, t, currentLocale }: ReportCardProps) => (
    <Card className="mb-2">
        <CardHeader className="p-4 flex flex-row items-start justify-between">
            <div>
                <CardTitle className="text-base">{report.name}</CardTitle>
                <CardDescription>{report.description || '...'}</CardDescription>
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -mr-2"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onViewReport(report)}><Eye className="mr-2 h-4 w-4" />{t('Common.view') || 'View'}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditReport(report)}><Edit className="mr-2 h-4 w-4" />{t('Common.edit')}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDeleteReport(report)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" />{t('Common.delete')}</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </CardHeader>
        <CardFooter className="px-4 pb-4 text-xs text-muted-foreground">
            {t('ReportsPage.tableCreatedHeader')}: {report.createdAt ? formatDistanceToNow(new Date(report.createdAt), { addSuffix: true, locale: currentLocale === 'es' ? es : enUS }) : ''}
        </CardFooter>
    </Card>
);


interface ReportListTableProps {
  reports: Report[];
  onViewReport: (report: Report) => void;
  onDeleteReport: (report: Report) => void;
}

export default function ReportListTable({ reports, onViewReport, onDeleteReport }: ReportListTableProps) {
  const { t, currentLocale } = useRxTranslate();

  const handleEdit = (report: Report) => {
    // Placeholder for future edit functionality
    alert(`Editing "${report.name}" is not yet implemented.`);
  };

  if (reports.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>{t('ReportsPage.noReportsFound')}</p>
        <p className="text-sm mt-2">{t('ReportsPage.noReportsHint')}</p>
      </div>
    );
  }

  return (
    <>
        <div className="md:hidden">
            {reports.map(report => (
                <ReportCard
                    key={report.id}
                    report={report}
                    onViewReport={onViewReport}
                    onDeleteReport={onDeleteReport}
                    onEditReport={handleEdit}
                    t={t}
                    currentLocale={currentLocale}
                />
            ))}
        </div>
        <div className="hidden md:block rounded-md border shadow-sm overflow-auto">
        <Table>
            <TableHeader>
            <TableRow>
                <TableHead className="font-semibold">{t('ReportsPage.tableNameHeader')}</TableHead>
                <TableHead className="font-semibold">{t('ReportsPage.tableDescriptionHeader')}</TableHead>
                <TableHead className="font-semibold text-center">{t('ReportsPage.tableCreatedHeader')}</TableHead>
                <TableHead className="font-semibold text-center">{t('Common.actions')}</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {reports.map((report) => (
                <TableRow key={report.id}>
                <TableCell className="font-medium">{report.name}</TableCell>
                <TableCell className="text-muted-foreground">{report.description || '...'}</TableCell>
                <TableCell className="text-center text-sm">
                    {report.createdAt ? formatDistanceToNow(new Date(report.createdAt), { addSuffix: true, locale: currentLocale === 'es' ? es : enUS }) : ''}
                </TableCell>
                <TableCell className="text-center">
                    <div className="flex justify-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => onViewReport(report)}>
                        <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(report)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDeleteReport(report)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                    </div>
                </TableCell>
                </TableRow>
            ))}
            </TableBody>
        </Table>
        </div>
    </>
  );
}
