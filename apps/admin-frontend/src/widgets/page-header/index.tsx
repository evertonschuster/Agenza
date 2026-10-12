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

interface PageHeaderParent {
  label: string;
  to: string;
}

interface PageHeaderProps {
  parents: readonly PageHeaderParent[];
  title: string;
}

function PageHeader({ parents, title }: PageHeaderProps) {
  return (
    <Breadcrumb aria-label="Caminho de navegação">
      <BreadcrumbList className="text-base md:text-lg">
        {parents.map((parent) => (
          <Fragment key={parent.to}>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link to={parent.to} />}>{parent.label}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </Fragment>
        ))}
        <BreadcrumbItem>
          <BreadcrumbPage render={<h1 />} className="text-base font-semibold md:text-lg">
            {title}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export { PageHeader };
export type { PageHeaderParent, PageHeaderProps };
