import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { useCloseRoute } from '@/shared/hooks/useCloseRoute';
import { toast } from '@/shared/ui/toast';
import { clientsRepository } from '../../../api/clientsRepository';
import { deleteClient } from '../../../application/clientUseCases';
import type { Client } from '../../../model/client';
import { CLIENTS_PATH } from '../../clientsPaths';
import type { UseClientDeletePageResult } from './useClientDeletePage.types';

export function useClientDeletePage(): UseClientDeletePageResult {
  const { id = '' } = useParams();
  const close = useCloseRoute(CLIENTS_PATH);
  const [client, setClient] = useState<Client>();

  useEffect(() => {
    const controller = new AbortController();

    void clientsRepository.get(id, controller.signal).then((result) => {
      if (controller.signal.aborted) return;

      if (result.ok) {
        setClient(result.data);
        return;
      }

      toast.serverError('Não foi possível abrir a pessoa', result.error);
      close();
    });

    return () => {
      controller.abort();
    };
  }, [id, close]);

  return {
    client,
    onOpenChange: (open) => {
      if (!open) close();
    },
    onConfirm: () => deleteClient(id),
  };
}
