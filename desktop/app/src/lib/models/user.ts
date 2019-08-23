export interface User {
    id: number,
    level: string,
    firstName: string,
    lastName?: string,
    created: string,
    session: {
        status: boolean
    },
    data: Array<object>
}
