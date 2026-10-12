export function formatAge(age: number): string {
  if (age < 1) return 'menos de 1 ano';
  return age === 1 ? '1 ano' : `${age} anos`;
}
