const fs = require('fs');
const path = require('path');

function decodeHtmlEntities(str) {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ');
}

function extractTestsFromHTML(filePath) {
  const html = fs.readFileSync(filePath, 'utf-8');
  const tests = [];
  const fileKey = filePath.includes("BTR's") ? 'btrs' : 'btr';

  const testBlockRegex = /<div id="test(\d+)"[\s\S]*?<h2>(.*?)<\/h2>\s*<iframe srcdoc="([\s\S]*?)"\s*frameborder/g;
  let match;

  while ((match = testBlockRegex.exec(html)) !== null) {
    const testId = match[1];
    const testName = match[2].trim();
    const srcdoc = decodeHtmlEntities(match[3]);

    const questionsMatch = srcdoc.match(/questions\s*=\s*(\[\{[\s\S]*?\}\])\s*;?\s*\n\s*(?:if\s*\(|$)/);
    if (!questionsMatch) {
      console.log(`Could not find questions in test: ${testName}`);
      continue;
    }

    try {
      let questionsStr = questionsMatch[1];

      const questions = JSON.parse(questionsStr);

      const durationMatch = srcdoc.match(/timeRemaining\s*=\s*(\d+)\s*\*\s*60/);
      const duration = durationMatch ? parseInt(durationMatch[1]) : 210;

      const cleanQuestions = questions.map((q, idx) => {
        let explanationText = '';
        if (q.explanation) {
          explanationText = q.explanation
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n')
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        }

        return {
          id: idx + 1,
          text: (q.text || '').trim(),
          options: (q.options || []).map(o => ({
            label: o.label,
            text: o.text,
            correct: !!o.correct
          })),
          correctAnswer: q.correct_answer || '',
          explanation: explanationText,
        };
      });

      tests.push({
        id: `${fileKey}_${testId}`,
        name: testName,
        questionCount: cleanQuestions.length,
        duration: duration,
        questions: cleanQuestions
      });

      console.log(`OK: ${testName} - ${cleanQuestions.length}q, ${duration}min`);
    } catch (e) {
      console.log(`FAIL: ${testName} - ${e.message.substring(0, 80)}`);
    }
  }

  return tests;
}

const file1 = path.join(__dirname, '..', 'attached_assets', "CEREB_BTR's_1771106306560.html");
const file2 = path.join(__dirname, '..', 'attached_assets', 'CEREB_BTR_1771106306560.html');

let allTests = [];

if (fs.existsSync(file1)) {
  const tests1 = extractTestsFromHTML(file1);
  allTests = allTests.concat(tests1);
  console.log(`\nFile 1: ${tests1.length} tests`);
}

if (fs.existsSync(file2)) {
  const tests2 = extractTestsFromHTML(file2);
  allTests = allTests.concat(tests2);
  console.log(`File 2: ${tests2.length} tests`);
}

console.log(`\nTotal: ${allTests.length} tests`);
let totalQ = 0;
allTests.forEach(t => totalQ += t.questionCount);
console.log(`Total questions: ${totalQ}`);

const outputPath = path.join(__dirname, '..', 'data', 'questions.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(allTests));
console.log(`Saved: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);
