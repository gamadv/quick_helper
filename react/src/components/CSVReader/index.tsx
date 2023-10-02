import { ChangeEvent, useState } from "react";

type CSVError = {
  row: number;
  message: string;
};

export const CSVReader: React.FC = () => {
  const [csvData, setCSVData] = useState<string[]>([]);
  const [errors, setErrors] = useState<CSVError[]>([]);

  const parseCSV = (csvString: string): string[] => {
    const rows: string[] = csvString.split("\n");
    const parsedData: string[] = [];

    rows.forEach((row, index) => {
      const columns: string[] = row.split(",");

      if (columns.length === 3) {
        parsedData.push(row);
      } else {
        setErrors((prevErrors) => [
          ...prevErrors,
          { row: index + 1, message: "Invalid format" },
        ]);
      }
    });

    return parsedData;
  };


  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>): void => {
    if (event.target.files) {
      const file: File = event.target.files[0];
      const reader: FileReader = new FileReader();

      reader.onload = (e: ProgressEvent<FileReader>): void => {
        if (e.target) {
          const csvContent: string = e.target.result as string;
          const data: string[] = parseCSV(csvContent);
          setCSVData(data);
        }
      };

      reader.readAsText(file);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileUpload} />
      <table>
        <tbody>
          {csvData.map((row, index) => (
            <tr key={index}>
              {row.split(",").map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {errors.length > 0 && (
        <div>
          <h2>Errors:</h2>
          <ul>
            {errors.map((error, index) => (
              <li key={index}>
                Row {error.row}: {error.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
