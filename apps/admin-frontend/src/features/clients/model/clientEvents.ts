import { createTopic } from '@/shared/pubsub/createTopic';

export const clientDeleted = createTopic<{ id: string }>();
