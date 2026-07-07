# Error Handling

Standard JSON response

{
 success:boolean,
 message:string,
 data:any,
 error_code:string|null
}

Never expose stack traces to clients.
