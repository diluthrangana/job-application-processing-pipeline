const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

// Function to extract data from CV
exports.extractDataFromCV = async (fileBuffer, fileExtension) => {
  try {
    let textContent = '';
    
    // Extract text based on file type
    if (fileExtension.toLowerCase() === '.pdf') {
      const pdfData = await pdfParse(fileBuffer);
      textContent = pdfData.text;
    } else if (fileExtension.toLowerCase() === '.docx') {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      textContent = result.value;
    } else {
      throw new Error('Unsupported file format');
    }
    
    // Extract sections from the text content
    const sections = extractSections(textContent);
    
    return {
      personal_info: sections.personalInfo,
      education: sections.education,
      qualifications: sections.qualifications,
      projects: sections.projects
    };
  } catch (error) {
    console.error('Error parsing CV:', error);
    throw error;
  }
};

// Function to extract sections from text content
const extractSections = (text) => {
  const result = {
    personalInfo: {},
    education: '',
    qualifications: '',
    projects: ''
  };

  // Extract name, email, and phone
  const nameMatch = text.match(/^([A-Za-z\s]+)/);
  if (nameMatch && nameMatch[1]) {
    result.personalInfo.name = nameMatch[1].trim();
  }
  const emailMatch = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
  if (emailMatch && emailMatch[1]) {
    result.personalInfo.email = emailMatch[1].trim();
  }
  const phoneMatch = text.match(/(\+?[0-9\s\-()]{10,})/);
  if (phoneMatch && phoneMatch[1]) {
    result.personalInfo.phone = phoneMatch[1].trim();
  }

  // Define section keywords
  const sectionKeywords = {
    education: ['education', 'academic background', 'academic qualifications'],
    qualifications: ['qualifications', 'skills', 'certifications'],
    projects: ['projects', 'experience', 'work experience']
  };
  
  // Split text into lines
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  let currentSection = null;
  let sectionContent = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();

    // Check for section titles
    for (const [section, keywords] of Object.entries(sectionKeywords)) {
      if (keywords.some(keyword => lowerLine.includes(keyword))) {
        if (currentSection) {
          result[currentSection] = sectionContent.trim();
        }
        currentSection = section;
        sectionContent = '';
        continue;
      }
    }

    // Append line to the current section
    if (currentSection) {
      sectionContent += line + ' ';
    }
  }

  // Add last processed section
  if (currentSection) {
    result[currentSection] = sectionContent.trim();
  }
  
  return result;
};
