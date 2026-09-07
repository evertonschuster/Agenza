import { Settings as SettingsIcon } from 'lucide-react';
import { ComingSoon } from './ComingSoon';

export function Settings() {
  return (
    <ComingSoon
      icon={SettingsIcon}
      title="Ajustes"
      description="Dados do negócio, equipe e preferências do painel vão morar aqui."
    />
  );
}
