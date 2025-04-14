export const BACKEND_URL = 'http://192.168.0.119:8001';

export const API_ENDPOINTS = {
    PROCESS_IMAGE: `${BACKEND_URL}/process_image/`,
    GET_IMAGE: (type: string, id: number) => `${BACKEND_URL}/image/${type}/${id}`,
    GET_PAGINATED_IMAGES: (page: number, perPage: number) => 
        `${BACKEND_URL}/images/paginated?page=${page}&per_page=${perPage}`,
}; 