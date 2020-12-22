import { HttpService, Injectable, Logger } from '@nestjs/common';
import { PersonSearchApiResponse } from 'src/interface/person-search-api.interface';
import { AxiosResponse, AxiosError } from 'axios';
import { URL } from 'url';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class SearchService {

  constructor (private http: HttpService) {}

  async getPersonSearchResults(offset: string = '0', body: {
    name?: string,
    skills?: [],
    experience?: string
  }): Promise<PersonSearchApiResponse>{
    try {
      const url = new URL(`${this.http.axiosRef.defaults.baseURL}/people/_search`)
      url.searchParams.append('offset', offset)
      let requestData = {}
      if (!body?.experience && !body?.skills) {
        requestData = {
          "name": {
            "term": body?.name
          }
        }
      } else {
        requestData = {
          "and": [
            {
              "name": {
                "term": body?.name
              }
            },
            ...body.skills.map(skill => ({
              "skill/role": {
                "text": skill,
                "experience": `${body.experience ?? 1}-plus-year`
              }
            }))
          ]
        }
      }
      Logger.log(requestData)

      const data: AxiosResponse<PersonSearchApiResponse> = await this.http.post<PersonSearchApiResponse>(url.href, requestData).toPromise()
      return data?.data
    } catch(error) {
      Logger.log(error)
      throw new NotFoundException({
        status: (error as AxiosError)?.response?.status,
        error: (error as AxiosError)?.response?.data?.message || 'Invalid search query'
      })
    }
  }
}