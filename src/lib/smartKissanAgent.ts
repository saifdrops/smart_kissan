import yaml from 'js-yaml'
import smartKissanYaml from '../data/smart-kissan-agent.yaml?raw'

export interface AgentInput {
  farmer_query: string
}

export interface WeatherData {
  main: {
    temp: number
    humidity: number
    pressure: number
  }
  weather: Array<{
    main: string
    description: string
  }>
  wind: {
    speed: number
  }
}

export interface SoilData {
  date: string
  time: string
  t0: number
  t10: number
  moisture: number
}

export interface DiseaseReport {
  condition: string
  explanation: string
  treatment: string
}

export interface AllocationPlan {
  request: string
  allocation: {
    approved_percent: number
    delivery_schedule: string
    priority: string
  }
  analysis: {
    soil_moisture: number
    recommendation: string
  }
  weather: {
    temperature_c: number
    humidity_percent: number
    condition: string
  }
  next_steps: string[]
}

export interface AgentResponse {
  weather?: WeatherData
  soil?: SoilData[]
  disease?: DiseaseReport
  allocation?: AllocationPlan
  final_answer?: string
  success: boolean
  error?: string
}

interface WorkflowStep {
  id: string
  type: string
  name: string
  when?: string
  provider?: string
  model?: string
  method?: string
  url?: string
  params?: Record<string, any>
  input?: Record<string, any>
  code?: string
  output: string
}

interface AgentConfig {
  name: string
  version: string
  description: string
  inputs: Record<string, any>
  workflow: WorkflowStep[]
  outputs: Record<string, string>
  fallbacks: Record<string, string>
}

class SmartKissanAgent {
  private config: AgentConfig
  private workflowResults: Record<string, any> = {}

  constructor() {
    try {
      this.config = yaml.load(smartKissanYaml) as AgentConfig
    } catch (error) {
      console.error('Failed to parse YAML configuration:', error)
      throw new Error('Invalid agent configuration')
    }
  }

  async execute(inputs: AgentInput): Promise<AgentResponse> {
    try {
      this.workflowResults = { inputs }
      const results: AgentResponse = { success: true }

      // Execute workflow steps in order
      for (const step of this.config.workflow) {
        try {
          // Check conditional execution
          if (step.when && !this.evaluateCondition(step.when)) {
            console.log(`Skipping step ${step.id} - condition not met: ${step.when}`)
            continue
          }

          console.log(`Executing step: ${step.id}`)
          const stepResult = await this.executeStep(step)
          this.workflowResults[step.output] = stepResult

          // Store results in response object
          if (step.id === 'weather_api') {
            results.weather = stepResult
          } else if (step.id === 'soil_data') {
            results.soil = stepResult
          } else if (step.id === 'disease_detection') {
            results.disease = stepResult
          } else if (step.id === 'allocation_agent') {
            results.allocation = stepResult
          } else if (step.id === 'response_formatter') {
            results.final_answer = stepResult
          }
        } catch (error) {
          console.warn(`Step ${step.id} failed, using fallback:`, error)
          const fallbackResult = this.getFallbackResult(step.id)
          this.workflowResults[step.output] = fallbackResult
          
          if (step.id === 'response_formatter') {
            results.final_answer = fallbackResult
          }
        }
      }

      return results
    } catch (error) {
      console.error('Agent execution failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        final_answer: this.getFallbackResult('response_formatter')
      }
    }
  }

  private evaluateCondition(condition: string): boolean {
    try {
      // Handle "contains" operations
      if (condition.includes('contains')) {
        const match = condition.match(/(\w+)\s+contains\s+'([^']+)'/i)
        if (match) {
          const [, variable, searchTerm] = match
          const value = this.workflowResults[variable]
          if (typeof value === 'string') {
            const result = value.toLowerCase().includes(searchTerm.toLowerCase())
            console.log(`Condition check: ${variable} contains '${searchTerm}' = ${result}`)
            return result
          }
        }
      }
      
      // Default to true for steps without conditions
      return true
    } catch (error) {
      console.warn('Error evaluating condition:', condition, error)
      return true
    }
  }

  private async executeStep(step: WorkflowStep): Promise<any> {
    switch (step.type) {
      case 'model_call':
        return await this.executeModelCall(step)
      case 'api_call':
        return await this.executeApiCall(step)
      case 'python':
        return this.executePythonCode(step)
      default:
        throw new Error(`Unknown step type: ${step.type}`)
    }
  }

  private async executeModelCall(step: WorkflowStep): Promise<any> {
    try {
      const prompt = this.interpolateTemplate(step.input?.prompt || '')
      console.log(`Executing model call: ${step.id}`)
      console.log(`Prompt: ${prompt.substring(0, 200)}...`)
      
      // Simulate model calls with intelligent responses
      let result: any
      
      if (step.id === 'query_refiner') {
        result = this.simulateQueryRefiner(prompt)
      } else if (step.id === 'disease_detection') {
        result = this.simulateDiseaseDetection()
      } else if (step.id === 'allocation_agent') {
        result = this.simulateAllocationAgent(prompt)
      } else if (step.id === 'response_formatter') {
        result = this.simulateResponseFormatter(prompt)
      } else {
        throw new Error(`Unknown model call: ${step.id}`)
      }
      
      console.log(`Model call result for ${step.id}:`, result)
      return result
    } catch (error) {
      console.error(`Model call failed for ${step.id}:`, error)
      throw error
    }
  }

  private async executeApiCall(step: WorkflowStep): Promise<any> {
    if (step.id === 'weather_api') {
      return await this.getWeatherData(step)
    }
    throw new Error(`Unknown API call: ${step.id}`)
  }

  private executePythonCode(step: WorkflowStep): any {
    if (step.id === 'soil_data') {
      return this.generateSoilData()
    }
    throw new Error(`Unknown Python execution: ${step.id}`)
  }

  private simulateQueryRefiner(prompt: string): string {
    const farmerQuery = this.workflowResults.inputs?.farmer_query?.toLowerCase() || ''
    console.log(`Query refiner processing: "${farmerQuery}"`)
    
    if (farmerQuery.includes('barsat') || farmerQuery.includes('rain') || farmerQuery.includes('weather') || farmerQuery.includes('موسم')) {
      const result = 'weather forecast and precipitation analysis needed'
      console.log(`Query refined to: ${result}`)
      return result
    } else if (farmerQuery.includes('paani') || farmerQuery.includes('water') || farmerQuery.includes('پانی') || farmerQuery.includes('irrigation')) {
      const result = 'resource allocation for water irrigation required'
      console.log(`Query refined to: ${result}`)
      return result
    } else if (farmerQuery.includes('disease') || farmerQuery.includes('بیماری') || farmerQuery.includes('leaf') || farmerQuery.includes('پتا')) {
      const result = 'disease detection and crop health analysis needed'
      console.log(`Query refined to: ${result}`)
      return result
    } else if (farmerQuery.includes('fertilizer') || farmerQuery.includes('khad') || farmerQuery.includes('کھاد')) {
      const result = 'resource allocation for fertilizer application required'
      console.log(`Query refined to: ${result}`)
      return result
    } else if (farmerQuery.includes('soil') || farmerQuery.includes('mitti') || farmerQuery.includes('مٹی')) {
      const result = 'soil analysis and moisture monitoring needed'
      console.log(`Query refined to: ${result}`)
      return result
    } else {
      const result = 'general agricultural advice and resource guidance needed'
      console.log(`Query refined to: ${result}`)
      return result
    }
  }

  private simulateDiseaseDetection(): DiseaseReport {
    const diseases = [
      {
        condition: "Early Blight",
        explanation: "Your crop shows signs of early blight disease with dark spots on leaves",
        treatment: "Apply copper-based fungicide every 7 days and remove affected leaves"
      },
      {
        condition: "Leaf Rust",
        explanation: "Orange-brown spots indicate leaf rust affecting your crop",
        treatment: "Use sulfur-based spray and improve air circulation around plants"
      },
      {
        condition: "Healthy",
        explanation: "Your crop leaves look healthy with good green color",
        treatment: "Continue current care practices and monitor regularly"
      }
    ]
    
    return diseases[Math.floor(Math.random() * diseases.length)]
  }

  private simulateAllocationAgent(prompt: string): AllocationPlan {
    const farmerQuery = this.workflowResults.inputs.farmer_query
    const weather = this.workflowResults.weather_data
    const soil = this.workflowResults.soil_data
    
    const isWaterRequest = farmerQuery.toLowerCase().includes('water') || farmerQuery.toLowerCase().includes('paani') || farmerQuery.toLowerCase().includes('پانی')
    const isFertilizerRequest = farmerQuery.toLowerCase().includes('fertilizer') || farmerQuery.toLowerCase().includes('khad') || farmerQuery.toLowerCase().includes('کھاد')
    
    return {
      request: farmerQuery,
      allocation: {
        approved_percent: isWaterRequest ? 85 : isFertilizerRequest ? 75 : 70,
        delivery_schedule: "Within 2-3 days",
        priority: weather?.main?.temp > 30 ? "High" : "Medium"
      },
      analysis: {
        soil_moisture: soil && soil.length > 0 ? soil[soil.length - 1].moisture : 0.22,
        recommendation: isWaterRequest ? "Increase irrigation frequency due to high temperature" : "Apply during cooler hours"
      },
      weather: {
        temperature_c: weather?.main?.temp || 28,
        humidity_percent: weather?.main?.humidity || 65,
        condition: weather?.weather?.[0]?.description || "partly cloudy"
      },
      next_steps: [
        "Confirm pickup location and timing",
        "Prepare application equipment",
        "Monitor crop response after application"
      ]
    }
  }

  private simulateResponseFormatter(prompt: string): string {
    const farmerQuery = this.workflowResults.inputs?.farmer_query?.toString() || ''
    const weather = this.workflowResults.weather_data
    const soil = this.workflowResults.soil_data
    const disease = this.workflowResults.disease_report
    const allocation = this.workflowResults.allocation_plan
    
    console.log('Response formatter inputs:', {
      farmerQuery,
      hasWeather: !!weather,
      hasSoil: !!soil,
      hasDisease: !!disease,
      hasAllocation: !!allocation
    })
    
    let response = ""
    
    // Start with acknowledgment
    if (farmerQuery && typeof farmerQuery === 'string' && (farmerQuery.toLowerCase().includes('barsat') || farmerQuery.toLowerCase().includes('rain'))) {
      response += "Based on current weather data, "
      if ((weather?.weather?.[0]?.description && typeof weather.weather[0].description === 'string' && weather.weather[0].description.includes('rain')) || weather?.main?.humidity > 80) {
        response += "there's a good chance of rain in the next day or two. "
      } else {
        response += "rain is not expected immediately, but humidity levels suggest possible showers later. "
      }
    } else if (farmerQuery && typeof farmerQuery === 'string' && (farmerQuery.toLowerCase().includes('paani') || farmerQuery.toLowerCase().includes('water'))) {
      response += "I understand you need water for your crops. "
    } else if (farmerQuery && typeof farmerQuery === 'string' && (farmerQuery.toLowerCase().includes('fertilizer') || farmerQuery.toLowerCase().includes('khad'))) {
      response += "Regarding your fertilizer needs, "
    } else {
      response += "Based on your farming question, "
    }
    
    // Add weather context
    if (weather) {
      response += `Current temperature is ${weather.main.temp}°C with ${weather.main.humidity}% humidity. `
      if (weather.main.temp > 30) {
        response += "It's quite hot, so your crops will need more water. "
      } else if (weather.main.temp < 20) {
        response += "The weather is cool, which is good for most crops. "
      }
    }
    
    // Add soil information
    if (soil && soil.length > 0) {
      const latestSoil = soil[soil.length - 1]
      const moisturePercent = (latestSoil.moisture * 100).toFixed(0)
      response += `Your soil moisture is at ${moisturePercent}%. `
      if (latestSoil.moisture < 0.2) {
        response += "This is on the low side, so consider watering your crops soon. "
      } else if (latestSoil.moisture > 0.25) {
        response += "Moisture levels are good, so you can wait a day before the next watering. "
      }
    }
    
    // Add disease information
    if (disease) {
      if (disease.condition && disease.condition !== "Healthy") {
        const conditionText = typeof disease.condition === 'string' ? disease.condition.toLowerCase() : disease.condition
        const treatmentText = typeof disease.treatment === 'string' ? disease.treatment.toLowerCase() : disease.treatment
        response += `I noticed signs of ${conditionText} in your crop. ${disease.explanation || 'Please monitor your crops closely.'} `
        response += `My recommendation: ${treatmentText || 'consult with local agricultural experts'}. `
      } else {
        response += "Your crops look healthy, which is great! "
      }
    }
    
    // Add allocation information
    if (allocation) {
      response += `Regarding your request for resources, I can approve ${allocation.allocation.approved_percent}% of what you asked for. `
      const deliverySchedule = allocation.allocation.delivery_schedule
      const scheduleText = typeof deliverySchedule === 'string' ? deliverySchedule.toLowerCase() : deliverySchedule
      response += `Delivery can be arranged ${scheduleText}. `
    }
    
    // Add farming tips
    if (response.length > 50) {
      response += "Pro tip: Water your crops early morning or late evening to reduce evaporation. "
      response += "Also, keep checking your plants daily for any changes in color or growth patterns."
    } else {
      // Fallback if no specific data was available
      response = "Based on general farming practices, water your crops in the morning, check for pests regularly, and monitor soil moisture. Keep an eye on weather patterns and adjust your irrigation accordingly."
    }
    
    console.log('Generated response:', response)
    return response.trim()
  }

  private async getWeatherData(step: WorkflowStep): Promise<WeatherData> {
    try {
      const params = new URLSearchParams(step.params as Record<string, string>)
      const response = await fetch(`${step.url}?${params}`)
      
      if (!response.ok) {
        throw new Error('Weather API request failed')
      }
      
      return await response.json()
    } catch (error) {
      // Return fallback weather data
      return {
        main: {
          temp: 28,
          humidity: 65,
          pressure: 1013
        },
        weather: [{
          main: 'Clear',
          description: 'clear sky'
        }],
        wind: {
          speed: 3.5
        }
      }
    }
  }

  private generateSoilData(): SoilData[] {
    const data: SoilData[] = []
    const startDate = new Date(2025, 8, 24) // September 24, 2025
    const endDate = new Date(2025, 8, 29)   // September 29, 2025
    
    let currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      for (const hour of [9, 15]) {
        const t0 = Math.round((Math.random() * (300 - 293) + 293) * 100) / 100
        const t10 = Math.round((t0 - (Math.random() * (3 - 1.5) + 1.5)) * 100) / 100
        const moisture = Math.round((Math.random() * (0.26 - 0.18) + 0.18) * 100) / 100
        
        data.push({
          date: currentDate.toISOString().split('T')[0],
          time: `${hour.toString().padStart(2, '0')}:00`,
          t0,
          t10,
          moisture
        })
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return data
  }

  private interpolateTemplate(template: string): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const keys = path.trim().split('.')
      let value = this.workflowResults
      
      for (const key of keys) {
        value = value?.[key]
      }
      
      return typeof value === 'string' ? value : JSON.stringify(value) || match
    })
  }

  private getFallbackResult(stepId: string): any {
    const fallbacks = this.config.fallbacks
    console.log(`Using fallback for step: ${stepId}`)
    
    switch (stepId) {
      case 'query_refiner':
        return 'general agricultural advice and resource guidance needed'
      case 'weather_api':
        return 'Weather conditions are moderate. Check local forecasts for rain.'
      case 'soil_data':
        return [{
          date: new Date().toISOString().split('T')[0],
          time: '09:00',
          t0: 295,
          t10: 293,
          moisture: 0.20
        }]
      case 'disease_detection':
        return {
          condition: 'Unknown',
          explanation: 'Unable to analyze image. Check for yellowing, spots, or wilting.',
          treatment: 'Apply general fungicide and improve plant care.'
        }
      case 'allocation_agent':
        return {
          request: this.workflowResults.inputs?.farmer_query || 'Resource request',
          allocation: {
            approved_percent: 70,
            delivery_schedule: 'Within 3-5 days',
            priority: 'Medium'
          },
          analysis: {
            soil_moisture: 0.20,
            recommendation: 'Monitor crop conditions regularly'
          },
          weather: {
            temperature_c: 25,
            humidity_percent: 60,
            condition: 'partly cloudy'
          },
          next_steps: ['Contact local cooperative', 'Prepare application area', 'Schedule follow-up']
        }
      case 'response_formatter':
        return 'Based on general farming practices, water your crops in the morning, check for pests regularly, and monitor soil moisture. Keep an eye on weather patterns and adjust your irrigation accordingly.'
      default:
        return 'Information not available at the moment. Please try again later.'
    }
  }
}

export const smartKissanAgent = new SmartKissanAgent()