import { createTopic } from '@/shared/pubsub/createTopic';

export const clientCreated = createTopic<{ id: string }>();
export const clientUpdated = createTopic<{ id: string }>();
export const clientDeleted = createTopic<{ id: string }>();
