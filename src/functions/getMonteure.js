export const getMonteure = async (options = {}) => {
  try {
    // This function should fetch all monteurs/workers
    // Replace with actual API call to your backend
    const monteure = [];
    
    return {
      status: 'success',
      data: {
        monteure: monteure
      }
    };
  } catch (error) {
    console.error('Error fetching monteurs:', error);
    return {
      status: 'error',
      details: error.message,
      data: {
        monteure: []
      }
    };
  }
};