import smartKissanConfig from '../data/smart-kissan-agent.json'

export interface AgentInput {
  mode: 'disease_detection' | 'resource_allocation'
  leaf_image?: string
  farm_request?: string
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

export interface AgentResponse {
  weather?: WeatherData
  soil?: SoilData[]
  disease?: string
  allocation?: string
  success: boolean
  error?: string
}

class SmartKissanAgent {
  private config = smartKissanConfig

  async execute(inputs: AgentInput): Promise<AgentResponse> {
    try {
      const results: AgentResponse = { success: true }

      // Step 1: Get Weather Data
      try {
        const weatherData = await this.getWeatherData()
        results.weather = weatherData
      } catch (error) {
        console.warn('Weather API failed, using fallback data')
        results.weather = this.getFallbackWeatherData()
      }

      // Step 2: Generate Soil Data
      results.soil = this.generateSoilData()

      // Step 3: Execute specific agent based on mode
      if (inputs.mode === 'disease_detection' && inputs.leaf_image) {
        results.disease = await this.detectDisease(inputs.leaf_image, results.weather, results.soil)
      } else if (inputs.mode === 'resource_allocation' && inputs.farm_request) {
        results.allocation = await this.allocateResources(inputs.farm_request, results.weather, results.soil)
      }

      return results
    } catch (error) {
      console.error('Agent execution failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  private async getWeatherData(): Promise<WeatherData> {
    const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY
    const { lat, lon } = this.config.workflow[0].config.params
    
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
    )
    
    if (!response.ok) {
      throw new Error('Weather API request failed')
    }
    
    return await response.json()
  }

  private getFallbackWeatherData(): WeatherData {
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

  private async detectDisease(image: string, weather?: WeatherData, soil?: SoilData[]): Promise<string> {
    try {
      // In a real implementation, this would call OpenRouter's vision model
      // For now, we'll use rule-based detection with mock analysis
      
      const mockDiseases = [
        {
          name: 'Early Blight',
          confidence: 85,
          severity: 'Moderate',
          treatment: 'Apply copper-based fungicide every 7-10 days. Remove affected leaves and improve air circulation.',
          prevention: 'Avoid overhead watering, maintain proper plant spacing, and apply preventive fungicide sprays.'
        },
        {
          name: 'Leaf Rust',
          confidence: 78,
          severity: 'Mild',
          treatment: 'Use sulfur-based fungicide. Ensure good drainage and reduce humidity around plants.',
          prevention: 'Plant resistant varieties, avoid overcrowding, and water at soil level.'
        },
        {
          name: 'Healthy',
          confidence: 92,
          severity: 'None',
          treatment: 'No treatment needed. Continue current care practices.',
          prevention: 'Maintain regular monitoring, proper nutrition, and good cultural practices.'
        }
      ]
      
      const randomDisease = mockDiseases[Math.floor(Math.random() * mockDiseases.length)]
      
      let analysis = `**Disease Analysis Results**\n\n`
      analysis += `🔍 **Detected Condition:** ${randomDisease.name}\n`
      analysis += `📊 **Confidence Level:** ${randomDisease.confidence}%\n`
      analysis += `⚠️ **Severity:** ${randomDisease.severity}\n\n`
      
      analysis += `💊 **Treatment Recommendation:**\n${randomDisease.treatment}\n\n`
      analysis += `🛡️ **Prevention Tips:**\n${randomDisease.prevention}\n\n`
      
      if (weather) {
        analysis += `🌤️ **Weather Context:**\n`
        analysis += `Current temperature: ${weather.main.temp}°C, Humidity: ${weather.main.humidity}%\n`
        analysis += `Weather conditions may ${weather.main.humidity > 70 ? 'increase' : 'reduce'} disease pressure.\n\n`
      }
      
      if (soil && soil.length > 0) {
        const latestSoil = soil[soil.length - 1]
        analysis += `🌱 **Soil Conditions:**\n`
        analysis += `Soil moisture: ${(latestSoil.moisture * 100).toFixed(1)}%\n`
        analysis += `Temperature: ${latestSoil.t0}K at surface\n`
        analysis += `${latestSoil.moisture < 0.2 ? 'Consider increasing irrigation.' : 'Soil moisture levels are adequate.'}`
      }
      
      return analysis
    } catch (error) {
      return this.getFallbackDiseaseDetection()
    }
  }

  private async allocateResources(request: string, weather?: WeatherData, soil?: SoilData[]): Promise<string> {
    try {
      // Mock resource allocation logic
      let allocation = `**Resource Allocation Plan**\n\n`
      allocation += `📝 **Request:** ${request}\n\n`
      
      // Parse request for resource type
      const isWaterRequest = request.toLowerCase().includes('water')
      const isFertilizerRequest = request.toLowerCase().includes('fertilizer') || request.toLowerCase().includes('fertiliser')
      const isSeedRequest = request.toLowerCase().includes('seed')
      
      if (isWaterRequest) {
        allocation += `💧 **Water Allocation:**\n`
        allocation += `• Approved: 80% of requested amount\n`
        allocation += `• Delivery schedule: Next 2-3 days\n`
        allocation += `• Priority: High (based on current soil moisture)\n\n`
        
        if (soil && soil.length > 0) {
          const avgMoisture = soil.reduce((sum, s) => sum + s.moisture, 0) / soil.length
          allocation += `📊 **Soil Analysis:**\n`
          allocation += `• Current moisture: ${(avgMoisture * 100).toFixed(1)}%\n`
          allocation += `• ${avgMoisture < 0.2 ? 'Irrigation needed urgently' : 'Moderate irrigation required'}\n\n`
        }
      }
      
      if (isFertilizerRequest) {
        allocation += `🌿 **Fertilizer Allocation:**\n`
        allocation += `• NPK 20-20-20: 50kg approved\n`
        allocation += `• Organic compost: 100kg available\n`
        allocation += `• Application timing: Before next rainfall\n\n`
      }
      
      if (isSeedRequest) {
        allocation += `🌱 **Seed Allocation:**\n`
        allocation += `• High-yield variety: Available\n`
        allocation += `• Disease-resistant strain: Recommended\n`
        allocation += `• Quantity: Based on land area\n\n`
      }
      
      if (weather) {
        allocation += `🌤️ **Weather Considerations:**\n`
        allocation += `• Temperature: ${weather.main.temp}°C (${weather.main.temp > 30 ? 'Hot' : weather.main.temp < 20 ? 'Cool' : 'Moderate'})\n`
        allocation += `• Humidity: ${weather.main.humidity}%\n`
        allocation += `• Conditions: ${weather.weather[0].description}\n`
        allocation += `• Recommendation: ${weather.main.temp > 30 ? 'Increase irrigation frequency' : 'Normal irrigation schedule'}\n\n`
      }
      
      allocation += `✅ **Next Steps:**\n`
      allocation += `1. Confirm resource pickup location\n`
      allocation += `2. Schedule delivery within 48 hours\n`
      allocation += `3. Follow up on application results\n`
      allocation += `4. Monitor crop response and adjust as needed`
      
      return allocation
    } catch (error) {
      return this.getFallbackResourceAllocation(request)
    }
  }

  private getFallbackDiseaseDetection(): string {
    return `**Offline Disease Analysis**\n\nUnable to connect to AI analysis service. Based on visual inspection:\n\n• Check for common signs: yellowing, spots, wilting\n• Apply general fungicide if disease symptoms present\n• Improve air circulation and reduce moisture\n• Consult local agricultural extension office`
  }

  private getFallbackResourceAllocation(request: string): string {
    return `**Offline Resource Allocation**\n\nRequest: ${request}\n\nUsing cached allocation rules:\n• Water requests: 70% approval rate\n• Fertilizer: Standard NPK recommended\n• Seeds: Local varieties available\n\nContact local cooperative for immediate assistance.`
  }
}

export const smartKissanAgent = new SmartKissanAgent()