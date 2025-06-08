export interface Story {
  id: number;
  title: string;
  url: string;
  score: number;
  time: number;
  by: string;
}

const HN_API_BASE = 'https://hacker-news.firebaseio.com/v0';

export const fetchTopStories = async (): Promise<Story[]> => {
  try {
    // Récupérer les IDs des meilleures stories
    const response = await fetch(`${HN_API_BASE}/topstories.json`);
    const storyIds = await response.json();
    
    // Prendre les 20 premières stories
    const topStoryIds = storyIds.slice(0, 20);
    
    // Récupérer les détails de chaque story
    const stories = await Promise.all(
      topStoryIds.map(async (id: number) => {
        const storyResponse = await fetch(`${HN_API_BASE}/item/${id}.json`);
        return storyResponse.json();
      })
    );
    
    // Filtrer les stories qui ont une URL
    return stories.filter((story: Story) => story && story.url);
  } catch (error) {
    console.error('Erreur lors de la récupération des actualités:', error);
    return [];
  }
};
