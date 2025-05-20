// A mock service to use while the server API is being fixed
import { delay } from '../utils/helpers';

// Mock successful save
export const mockSaveHikeRecord = async (hikeData) => {
  // Simulate network delay
  await delay(1000);
  
  // Return a mock successful response
  return {
    id: Date.now(),
    success: true,
    message: 'Hike saved successfully'
  };
};

// Helper function for delay
export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));