import { api, getErrorMessage } from './authApi';

export const symptomApi = {
    // Get advice for a symptom (POST /api/pharmacy/symptom/advice)
    getAdvice: async (symptom, patientEmail) => {
        try {
            const response = await api.post('/pharmacy/symptom/advice', {
                symptom,
                patientEmail
            });
            return response.data;
        } catch (error) {
            const message = getErrorMessage(error, 'Unable to process symptom request. Please try again.');
            throw new Error(message);
        }
    },

    // Get symptom advice query history (GET /api/pharmacy/symptom/history)
    getHistory: async (patientEmail, limit = 20) => {
        try {
            const response = await api.get('/pharmacy/symptom/history', {
                params: { patientEmail, limit }
            });
            return response.data;
        } catch (error) {
            console.warn('Failed to fetch symptom history:', error);
            return [];
        }
    },

    // Get details of a single history item (GET /api/pharmacy/symptom/history/{id})
    getHistoryDetail: async (id) => {
        try {
            const response = await api.get(`/pharmacy/symptom/history/${id}`);
            return response.data;
        } catch (error) {
            const message = getErrorMessage(error, 'Failed to fetch history details.');
            throw new Error(message);
        }
    },

    // Delete a history entry (DELETE /api/pharmacy/symptom/history/{id})
    deleteHistory: async (id) => {
        try {
            await api.delete(`/pharmacy/symptom/history/${id}`);
            return true;
        } catch (error) {
            console.warn(`Failed to delete history item #${id}:`, error);
            return false;
        }
    }
};

export default symptomApi;
