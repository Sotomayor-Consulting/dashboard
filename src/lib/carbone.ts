import carbone from 'carbone';
import path from 'path';

export const generatePdf = (templateName: string, data: any): Promise<Buffer> => {
  const templatePath = path.resolve(process.cwd(), 'src/templates', templateName);
  return new Promise((resolve, reject) => {
    carbone.render(templatePath, data, { convertTo: 'pdf' }, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};