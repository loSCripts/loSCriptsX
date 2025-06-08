import { useCallback } from 'react';

const AFFILIATE_PARAM = 'loscriptsx-affiliate';

export const useAffiliateLink = () => {
  const handleLinkClick = useCallback((url: string, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
    }

    try {
      const urlObject = new URL(url);
      
      // Ajoute le paramètre d'affiliation à tous les liens
      urlObject.searchParams.append('from', AFFILIATE_PARAM);
      
      // Ouvre le lien modifié dans un nouvel onglet
      window.open(urlObject.toString(), '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Erreur lors du traitement du lien:', error);
      // En cas d'erreur, ouvre le lien original
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, []);

  return { handleLinkClick };
};