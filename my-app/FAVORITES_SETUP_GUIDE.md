# Favorites Functionality Setup Guide

This guide provides comprehensive instructions for setting up and implementing the favorites functionality in the Ascentra Hiking App.

## Overview

The favorites functionality allows users to:

- Mark hiking spots as favorites
- View their favorite hiking spots in a dedicated page
- Remove favorites anytime
- See favorite counts on hiking spots
- Access favorites from their profile page

## Database Setup

### 1. Run the Favorites Schema Script

Execute the `setup_favorites_schema.sql` script in your Supabase SQL Editor:

```sql
-- This script creates:
-- ✅ user_favorites table with proper relationships
-- ✅ Indexes for optimal performance
-- ✅ Row Level Security policies
-- ✅ Helper views for easy data retrieval
-- ✅ Database functions for favorites management
```

### 2. Verify Database Setup

After running the script, verify these components exist:

**Tables:**

- `user_favorites` - Stores user favorite relationships

**Views:**

- `user_favorites_with_details` - User favorites with hiking spot details
- `hiking_spots_with_favorites` - Hiking spots with favorite counts

**Functions:**

- `toggle_favorite(user_id, hiking_spot_id)` - Toggle favorite status
- `is_favorited(user_id, hiking_spot_id)` - Check if spot is favorited

## Frontend Implementation

### 1. Database Service Functions

The following functions are available in `services/databaseService.ts`:

```typescript
// Toggle favorite status
await toggleFavorite(hikingSpotId: string): Promise<boolean>

// Check if spot is favorited
await isFavorited(hikingSpotId: string): Promise<boolean>

// Get user's favorite spots
await getUserFavorites(): Promise<HikingSpot[]>

// Get all hiking spots with favorite status
await getHikingSpotsWithFavorites(): Promise<HikingSpot[]>

// Remove a favorite
await removeFavorite(hikingSpotId: string): Promise<boolean>
```

### 2. Hiking Spot Interface

The `HikingSpot` interface includes favorite-related fields:

```typescript
export interface HikingSpot {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  difficulty: string;
  elevation: number;
  trail_length: number;
  estimated_duration: number;
  image_url: string;
  images: string[];
  rating: number;
  review_count: number;
  favorite_count?: number; // Total favorites for this spot
  is_favorited?: boolean; // Whether current user favorited this spot
}
```

### 3. Implementation Steps

#### Step 1: Add Favorite Button to Hiking Spots

In your hiking spot components, add a favorite button:

```typescript
import { toggleFavorite, isFavorited } from '../services/databaseService';

const [isFav, setIsFav] = useState(false);

// Check initial favorite status
useEffect(() => {
  const checkFavoriteStatus = async () => {
    const favorited = await isFavorited(hikingSpot.id);
    setIsFav(favorited);
  };
  checkFavoriteStatus();
}, [hikingSpot.id]);

// Handle favorite toggle
const handleFavoriteToggle = async () => {
  try {
    const newStatus = await toggleFavorite(hikingSpot.id);
    setIsFav(newStatus);
  } catch (error) {
    console.error('Error toggling favorite:', error);
    // Show error message to user
  }
};

// Render favorite button
<TouchableOpacity onPress={handleFavoriteToggle}>
  <Icon
    name={isFav ? 'heart' : 'heart-outline'}
    color={isFav ? '#ff4444' : '#666'}
  />
</TouchableOpacity>
```

#### Step 2: Create Favorites Page

Create a new screen component for displaying user favorites:

```typescript
import React, { useState, useEffect } from 'react';
import { getUserFavorites, removeFavorite } from '../services/databaseService';

const FavoritesScreen = () => {
  const [favorites, setFavorites] = useState<HikingSpot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const userFavorites = await getUserFavorites();
      setFavorites(userFavorites);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (spotId: string) => {
    try {
      await removeFavorite(spotId);
      setFavorites(prev => prev.filter(spot => spot.id !== spotId));
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  // Render favorites list...
};
```

#### Step 3: Add Favorites Button to Profile

In your profile screen, add a button to navigate to favorites:

```typescript
<TouchableOpacity
  onPress={() => navigation.navigate('Favorites')}
  style={styles.favoritesButton}
>
  <Text>Favorites</Text>
</TouchableOpacity>
```

#### Step 4: Update Navigation

Add the Favorites screen to your navigation stack:

```typescript
// In your navigation configuration
<Stack.Screen
  name="Favorites"
  component={FavoritesScreen}
  options={{ title: 'My Favorites' }}
/>
```

## UI Design Guidelines

### Favorite Button States

- **Unfavorited**: Outline heart icon, gray color
- **Favorited**: Filled heart icon, red color (#ff4444)
- **Loading**: Show loading indicator

### Favorites Page Layout

- Use the same container style as the homepage for consistency
- Display hiking spots in a grid or list format
- Include remove favorite option (swipe or button)
- Show empty state when no favorites exist

### Error Handling

- Show user-friendly error messages
- Handle network connectivity issues
- Provide retry options for failed operations

## Security Considerations

### Row Level Security (RLS)

The favorites table uses RLS policies to ensure:

- Users can only manage their own favorites
- Favorite counts are publicly viewable
- Unauthorized access is prevented

### Authentication Requirements

- Users must be logged in to manage favorites
- Guest users can view hiking spots but cannot favorite them
- Proper error handling for unauthenticated requests

## Performance Optimizations

### Database Indexes

The setup includes optimized indexes for:

- User favorites lookup
- Hiking spot favorites count
- Composite queries

### Caching Strategy

- Cache favorite status locally when possible
- Implement optimistic updates for better UX
- Refresh data when returning to favorites page

## Testing

### Test Scenarios

1. **Favorite Toggle**
   - Toggle favorite on/off multiple times
   - Verify database updates correctly
   - Check UI state updates

2. **Favorites Page**
   - Load favorites list
   - Remove favorites
   - Handle empty state

3. **Authentication**
   - Test with logged-in users
   - Test with guest users
   - Test session expiration

4. **Performance**
   - Test with large numbers of favorites
   - Test network connectivity issues
   - Test concurrent favorite operations

## Troubleshooting

### Common Issues

1. **"Function toggle_favorite does not exist"**
   - Ensure the favorites schema script was run completely
   - Check Supabase function permissions

2. **"User must be logged in" errors**
   - Verify user authentication status
   - Check Supabase session validity

3. **Favorites not loading**
   - Check RLS policies are correctly applied
   - Verify user permissions
   - Check network connectivity

4. **UI not updating after favorite toggle**
   - Ensure state management is properly implemented
   - Check for component re-rendering issues

### Debug Steps

1. Check Supabase logs for database errors
2. Verify user authentication in console
3. Test database functions directly in Supabase
4. Check network requests in developer tools

## Next Steps

After implementing the favorites functionality:

1. **Profile Page Updates**
   - Add favorites button under "About Me"
   - Update username/bio editing
   - Display skill level
   - Remove email display

2. **Enhanced Features**
   - Favorite categories or tags
   - Favorite sharing functionality
   - Favorite recommendations
   - Export favorites list

3. **Analytics**
   - Track favorite usage patterns
   - Monitor popular hiking spots
   - User engagement metrics

## Support

For additional help:

- Check Supabase documentation for RLS and functions
- Review React Native navigation guides
- Test thoroughly on both iOS and Android platforms

---

**Status**: ✅ Database schema ready, service functions implemented
**Next**: Implement UI components and navigation
