/** The information notice law 09-08 requires wherever personal data is collected. */
export const privacyPurposes = {
  catalogue: 'vous donner accès au catalogue',
  'rendez-vous': 'organiser votre rendez-vous',
  pro: 'répondre à votre projet',
} as const;

export function privacyNotice(form: keyof typeof privacyPurposes, email: string, cndpReceipt = ''): string {
  const receipt = cndpReceipt.trim();
  return `Racha Home traite ces informations pour ${privacyPurposes[form]} et les conserve trois ans. `
    + `Conformément à la loi n° 09-08, vous pouvez y accéder, les rectifier ou vous opposer à leur traitement en écrivant à ${email}.`
    + (receipt ? ` Ce traitement a été déclaré à la CNDP sous le n° ${receipt}.` : '');
}
