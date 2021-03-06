import { Injectable, Logger } from '@nestjs/common';
import { Person } from '@prisma/client';
import { ComparePeople } from 'src/interface/compare-api.interface';
import { PersonApiResponse } from 'src/interface/person-api.interface';
import { OpportunityService } from 'src/opportunity/opportunity.service';
import { PersonService } from 'src/person/person.service';
import { CreatePersonComparison } from './dto/create-person-comparison.dto';

@Injectable()
export class CompareService {

  private readonly logger: Logger = new Logger(CompareService.name)

  constructor (private person: PersonService) {}

  async comparePeople(first_id: string, second_id: string, skills: [] = []): Promise<ComparePeople> {
    // Fetch the first's ID from the API & Database
    const firstUser: PersonApiResponse = await this.person.getPerson(first_id);
    let firstUserLocal: Person = await this.person.retrievePerson({
      username: first_id
    })

    // If the person hasn't been created locally, create them for future fetches
    if (!firstUserLocal) {
      await this.person.createPerson(
        firstUser
      )
      firstUserLocal = await this.person.retrievePerson({
        username: first_id
      })
    }

    // Build comparison Data
    const firstUserCompared = this.buildComparedUser(firstUser, firstUserLocal, skills)
    
    // Run the same flow for the second user
    const secondUser: PersonApiResponse = await this.person.getPerson(second_id)
    let secondUserLocal: Person = await this.person.retrievePerson({
      username: second_id
    })

    if (!secondUserLocal) {
      await this.person.createPerson(
        secondUser
      )
      secondUserLocal = await this.person.retrievePerson({
        username: second_id
      })
    }
    
    const secondCompared = this.buildComparedUser(secondUser, secondUserLocal, skills)

    const preferred = firstUserCompared.confidenceScore - secondCompared.confidenceScore > 0 ? "1" : "2" 

    return {
      compared: {
        "1" : firstUserCompared,
        "2": secondCompared
      },
      preferredIndex: preferred
     } as ComparePeople

  }

  // @tslint-disable
  private buildComparedUser(user: PersonApiResponse, userLocal: Person, skills: []): CreatePersonComparison{

    const firstName = user.person.name.split(' ')[0]
    const comparedUser = CreatePersonComparison.generateFromApi(userLocal)

    // Calculate the users confidence score matching the comparison criteria, giving preferences to chosen skills
    comparedUser.confidenceScore = (user.strengths.filter(x => skills.includes(x?.name as never)).length * 5000) + user.person.weight

    const employmentDates = user.jobs.map(job => (
      [job.fromMonth && job.fromYear ? new Date(`${job.fromMonth}, ${job.fromYear}`) : new Date(), 
      job.toMonth && job.toYear ? new Date(`${job.toMonth}, ${job.toYear}`) : new Date()]
      )
    )
    
    const employmentTimeStamps = employmentDates?.flat().filter(Boolean).sort((a: any, b: any) => a - b)
    const earliestEmployment = employmentTimeStamps?.[0]
    const mostRecentEmployment = employmentTimeStamps?.[employmentTimeStamps?.length - 1]

    let careerLifeSpan = (mostRecentEmployment as unknown as Date)?.getFullYear() - (earliestEmployment as unknown as Date)?.getFullYear()

    comparedUser.employmentDuration = (`${firstName} has had total career lifespan of ${careerLifeSpan} years and worked at over, ${employmentDates.length} firms during the period.` )
    
    // Duplicate employment dates so sort doesn't affect original array
    const sortedDates = new Array(...employmentDates)
    comparedUser.longestExperience = user.jobs[employmentDates.indexOf(sortedDates.sort((a, b) => (b[1]?.getFullYear() - b[0]?.getFullYear()) - (a[1]?.getFullYear() - a[0].getFullYear()))[0])]
    
    comparedUser.topFiveSkills = user.strengths.sort((a, b) => b.weight - a.weight).slice(0, 5)

    comparedUser.skillsBreakdown = skills.length > 0 ? 
      user.strengths.filter(x => skills.includes(x?.name as never)).length > 0 ? 
      `${firstName} has ${user.strengths.filter(x => skills.includes(x?.name as never)).length} of your selected skills! ${comparedUser.topFiveSkills.filter(x => skills.includes(x?.name as never)).length} of which are in their top ${comparedUser.topFiveSkills.length} skills` : 
      `${firstName} does not have any of your selected strengths as skills` : `You didn't select any skills so you can't get skill insights`

    
    comparedUser.numberOfOpportunities = `${firstName} has been involved in ${user.experiences.length} projects/jobs and volunteer experiences`
    return comparedUser;
  }

}
