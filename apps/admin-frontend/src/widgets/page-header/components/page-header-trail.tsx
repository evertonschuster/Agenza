import { Fragment } from 'react';
import { Link } from 'react-router';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/shared/ui/breadcrumb';
import type { PageHeaderTrailProps } from '../page-header.types';

function PageHeaderTrail({ parents, title }: PageHeaderTrailProps) {
  return (
    <Breadcrumb aria-label="Caminho de navegação" className="min-w-0">
      <BreadcrumbList className="text-lg md:text-xl">
        {parents.map((parent) => (
          <Fragment key={parent.to}>
            <BreadcrumbItem className="hidden md:inline-flex">
              <BreadcrumbLink render={<Link to={parent.to} />}>{parent.label}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:inline-flex" />
          </Fragment>
        ))}
        <BreadcrumbItem>
          <BreadcrumbPage render={<h1 />} className="font-semibold tracking-tight">
            {title}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export { PageHeaderTrail };
