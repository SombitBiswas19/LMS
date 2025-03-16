import React, { useEffect, useState } from "react";

const CourseContent = ({ courseId }) => {
  const [contents, setContents] = useState([]);

  useEffect(() => {
    fetch(`http://localhost:5000/api/contents/${courseId}`)
      .then((res) => res.json())
      .then((data) => console.log(data))
      .catch((err) => console.error("Error fetching content:", err));

  }, [courseId]);

  return (
    <div>
      {contents.map(content => (
        <div key={content._id}>
          <h3>{content.title}</h3>
          {content.type === "video" ? (
            <video src={content.url} controls width="500px" />
          ) : (
            <a href={content.url} download>Download PDF</a>
          )}
        </div>
      ))}
    </div>
  );
};

export default CourseContent;
