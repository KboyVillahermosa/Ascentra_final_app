import * as Linking from 'expo-linking';

export const linking = {
  prefixes: ['ascentra://', 'https://email-confirmation-6j4r.onrender.com'],
  config: {
    screens: {
      Login: 'login',
      Register: 'register',
      EmailConfirmation: 'auth/callback',
      EmailConfirmationSuccess: 'auth/success',
      Home: 'home',
      HikingSpotDetails: 'spot/:spotId',
      ActivityDetails: 'activity/:id',
      Tracking: 'tracking',
      HikeHistory: 'history',
      SaveActivity: 'save-activity',
      Posts: 'posts',
      Comments: 'comments/:postId',
      Profile: 'profile/:userId?',
      EditProfile: 'edit-profile',
      ChangePassword: 'change-password',
      MediaViewer: 'media-viewer',
      HikeDetail: 'hike/:hikeId',
      ActivityComments: 'activity-comments/:activityId',
      SaveConfirmation: 'save-confirmation/:hikeId',
      InteractiveMap: 'interactive-map',
    },
  },
};
