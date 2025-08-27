import { supabase } from '../services/supabaseClient';

export const testSupabaseConnection = async (): Promise<void> => {
  try {
    console.log('Testing Supabase connection...');
    
    // Test basic connectivity with a simple query
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
    } else {
      console.log('Supabase connection test successful:', data);
    }
  } catch (networkError) {
    console.error('Network error during Supabase test:', networkError);
    console.error('Network error details:', {
      name: (networkError as Error).name,
      message: (networkError as Error).message,
      stack: (networkError as Error).stack
    });
  }
};

export const testBasicNetworkConnectivity = async (): Promise<void> => {
  try {
    console.log('Testing basic network connectivity...');
    
    // Test with a simple fetch to a reliable endpoint
    const response = await fetch('https://httpbin.org/get', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      console.log('Basic network connectivity: OK');
    } else {
      console.error('Basic network connectivity failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Basic network test failed:', error);
  }
};