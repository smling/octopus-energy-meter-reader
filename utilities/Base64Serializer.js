export const Base64Serializer = {
    deserialize : (value) => {
        return atob(value);
    }
}