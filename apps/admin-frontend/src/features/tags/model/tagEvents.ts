import { createTopic } from '@/shared/pubsub/createTopic';

export const tagDeleted = createTopic<{ id: string }>();
export const tagSaved = createTopic<{ id: string }>();
