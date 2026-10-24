import { FormFieldsSkeleton } from '@/shared/ui/form-field';
import { PageSection } from '@/widgets/page-section';

const PERSON_FIELD_COUNT = 6;

function ClientFormSkeleton() {
  return (
    <PageSection title="Dados da pessoa" hideTitle>
      <FormFieldsSkeleton fieldCount={PERSON_FIELD_COUNT} />
    </PageSection>
  );
}

export { ClientFormSkeleton };
