import { HttpService, Injectable, Logger } from '@nestjs/common';
import { PersonSearchApiResponse } from 'src/interface/person-search-api.interface';
import { AxiosResponse, AxiosError } from 'axios';
import { URL } from 'url';
import { NotFoundException } from '@nestjs/common';
import { OpportunitySearchApiResponse } from 'src/interface/opportunity-search-api.interface';

@Injectable()
export class SearchService {

  private readonly logger = new Logger(SearchService.name)

  constructor (private http: HttpService) {}

  async getPersonSearchResults(offset: string = '0', body: {
    name?: string,
    skills?: string[]
  }): Promise<PersonSearchApiResponse>{
    try {
      const url = new URL(`${this.http.axiosRef.defaults.baseURL}/people/_search/`)
      url.searchParams.append('offset', offset)
      let requestData = {}
      this.logger.verbose(body.skills)
      if (body?.name && body.skills.length < 1) {
        requestData = {
          "name": {
            "term": body?.name
          }
        }
      } else if(!body?.name && body.skills.length > 0 && body.skills.length < 2) {
        requestData = {
          "skill/role": {
            "text": body.skills[0],
            "experience": "1-plus-year"
          }
        }
      } else {
        requestData = {
          "and": [
            body?.name ? {
              "name": {
                "term": body?.name
              }
            } : false,
            ...body.skills.map(skill => ({
              "skill/role": {
                "text": skill,
                "experience": `1-plus-year`
              }
            }))
          ].filter(Boolean)
        }
      }
      this.logger.verbose(requestData)
      const data: AxiosResponse<PersonSearchApiResponse> = await this.http.post<PersonSearchApiResponse>(url.href, requestData).toPromise()
      return data?.data
    } catch(error) {
      this.logger.verbose(error)
      throw new NotFoundException({
        status: (error as AxiosError)?.response?.status,
        error: (error as AxiosError)?.response?.data?.message || 'Invalid search query'
      })
    }
  }

  async getOpportunitySearchResults(offset: string = '0', body: {
    code?: string,
    skills?: []
  }): Promise<OpportunitySearchApiResponse>{
    try {
      const url = new URL(`${this.http.axiosRef.defaults.baseURL}/opportunities/_search/`)
      url.searchParams.append('offset', offset)
      let requestData = {}
      if (body.skills.length < 1) {
        requestData = {
          "skill/role": {
            "text": body?.code,
            "experience": "potential-to-develop"
          }
        }
      } else {
        requestData = {
          "and": [
            ...body.skills.map(skill => ({
              "skill/role": {
                "text": skill,
                "experience": `potential-to-develop`
              }
            }))
          ]
        }
      }
      const data: AxiosResponse<OpportunitySearchApiResponse> = await this.http.post<OpportunitySearchApiResponse>(url.href, requestData).toPromise()
      return data?.data
    } catch(error) {
      throw new NotFoundException({
        status: (error as AxiosError)?.response?.status,
        error: (error as AxiosError)?.response?.data?.message || 'Invalid search query'
      })
    }
  }
}
