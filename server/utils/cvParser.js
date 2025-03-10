const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { GoogleGenerativeAI } = require('@google/generative-ai');

exports.extractDataFromCV = async (fileBuffer, fileExtension) => {
  try {
    let textContent = '';
    
    if (fileExtension.toLowerCase() === '.pdf') {
      const pdfData = await pdfParse(fileBuffer);
      textContent = pdfData.text;
    } else if (fileExtension.toLowerCase() === '.docx') {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      textContent = result.value;
    } else {
      throw new Error('Unsupported file format');
    }
    
    const personalInfo = extractPersonalInfo(textContent);
    
    const structuredData = await extractStructuredDataWithGemini(textContent);
    
    return {
      personal_info: { ...personalInfo, ...structuredData.personal_info },
      education: structuredData.education,
      qualifications: structuredData.qualifications,
      projects: structuredData.projects
    };
  } catch (error) {
    console.error('Error parsing CV:', error);
    throw error;
  }
};

const extractPersonalInfo = (text) => {
  const personalInfo = {};
  
  const nameMatch = text.match(/^([A-Za-z\s]+)/);
  if (nameMatch && nameMatch[1]) {
    personalInfo.name = nameMatch[1].trim();
  }
  
  const emailMatch = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
  if (emailMatch && emailMatch[1]) {
    personalInfo.email = emailMatch[1].trim();
  }
  
  const phoneMatch = text.match(/(\+?[0-9\s\-()]{10,})/);
  if (phoneMatch && phoneMatch[1]) {
    personalInfo.phone = phoneMatch[1].trim();
  }
  
  return personalInfo;
};

const extractStructuredDataWithGemini = async (textContent) => {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    
    const prompt = `
    Parse the following CV text and extract structured information in JSON format.
    Extract the following sections:
    1. Personal Information (name, contact details if present)
    2. Education (list of institutions, degrees, years)
    3. Qualifications/Skills (list of skills, certifications, etc.)
    4. Projects (list of projects with name, description, and technologies used)
    
    Return the data in the following JSON structure:
    {
      "personal_info": { },
      "education": [ { "institution": "", "degree": "", "year": "" }, ... ],
      "qualifications": [ { "name": "", "details": "" }, ... ],
      "projects": [ { "name": "", "description": "", "technologies": "" }, ... ]
    }
    
    CV Text:
    ${textContent}
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();
    
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                      responseText.match(/{[\s\S]*}/);
                      
    let parsedData;
    if (jsonMatch) {
      const jsonString = jsonMatch[1] || jsonMatch[0];
      try {
        parsedData = JSON.parse(jsonString);
      } catch (jsonError) {
        console.error('Error parsing JSON from response:', jsonError);
        console.log('Raw response text:', responseText);
        console.log('Extracted JSON string:', jsonString);
        throw new Error('Failed to parse JSON from Gemini response');
      }
    } else {
      console.error('No JSON pattern found in Gemini response:', responseText);
      throw new Error('Failed to extract structured data from Gemini response');
    }
    
    return {
      personal_info: parsedData.personal_info || {},
      education: parsedData.education || [],
      qualifications: parsedData.qualifications || [],
      projects: parsedData.projects || []
    };
  } catch (error) {
    console.error('Error using Gemini API:', error);
    return {
      personal_info: {},
      education: [],
      qualifications: [],
      projects: []
    };
  }
};
