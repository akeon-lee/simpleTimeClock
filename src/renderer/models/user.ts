export interface User {
  id: number,
  level: string,
  firstName: string,
  lastName?: string,
  session: {
    status: boolean
  },
  data: Array<object>
}
